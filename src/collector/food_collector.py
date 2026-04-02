import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError


BASE_URL = "http://openapi.foodsafetykorea.go.kr/api"
SERVICE_ID = "C002"
BATCH_SIZE = 1000
MAX_RETRIES = 3
RETRY_DELAY = 2.0
REQUEST_DELAY = 0.5


@dataclass
class CollectResult:
    total_expected: int
    total_collected: int
    failed_batches: list[tuple[int, int]]


def _get_api_key() -> str:
    from dotenv import load_dotenv

    load_dotenv()
    key = os.getenv("food_api_key")
    if not key:
        raise ValueError(".env 파일에 food_api_key가 설정되어 있지 않습니다.")
    return key.strip()


def _build_url(api_key: str, start: int, end: int, category: str) -> str:
    encoded_category = quote(category)
    return f"{BASE_URL}/{api_key}/{SERVICE_ID}/json/{start}/{end}/PRDLST_DCNM={encoded_category}"


def _fetch_batch(api_key: str, start: int, end: int, category: str) -> list[dict]:
    url = _build_url(api_key, start, end, category)
    req = Request(url)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            result = data.get(SERVICE_ID, {})
            code = result.get("RESULT", {}).get("CODE", "")

            if code == "INFO-000":
                return result.get("row", [])
            elif code == "INFO-200":
                return []
            else:
                msg = result.get("RESULT", {}).get("MSG", "알 수 없는 오류")
                print(f"  [경고] 배치 {start}-{end} 응답 오류: {code} - {msg}")
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY * attempt)
                    continue
                return []

        except (URLError, HTTPError, json.JSONDecodeError) as e:
            print(f"  [재시도 {attempt}/{MAX_RETRIES}] 배치 {start}-{end} 실패: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY * attempt)
            else:
                raise

    return []


def _get_total_count(api_key: str, category: str) -> int:
    url = _build_url(api_key, 1, 1, category)
    with urlopen(Request(url), timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return int(data[SERVICE_ID]["total_count"])


def _worker(args: tuple) -> tuple[int, int, list[dict]]:
    api_key, start, end, category, batch_idx = args
    time.sleep(REQUEST_DELAY * batch_idx)
    rows = _fetch_batch(api_key, start, end, category)
    print(f"  [완료] 배치 {start:>6}-{end:>6} | {len(rows)}건 수집")
    return start, end, rows


def collect(category: str = "과자", output_dir: str | None = None) -> CollectResult:
    api_key = _get_api_key()
    total = _get_total_count(api_key, category)
    print(f"[수집 시작] 카테고리: {category} | 총 {total:,}건 | 배치 크기: {BATCH_SIZE}")

    max_workers = os.cpu_count() // 2 or 1
    print(f"[설정] 워커 수: {max_workers} (CPU {os.cpu_count()}개의 절반)")

    batches = []
    for idx, start in enumerate(range(1, total + 1, BATCH_SIZE)):
        end = min(start + BATCH_SIZE - 1, total)
        batches.append((api_key, start, end, category, idx))

    all_rows: list[dict] = []
    failed_batches: list[tuple[int, int]] = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_worker, batch): batch for batch in batches}
        for future in as_completed(futures):
            batch = futures[future]
            start, end = batch[1], batch[2]
            try:
                _, _, rows = future.result()
                all_rows.extend(rows)
            except Exception as e:
                print(f"  [실패] 배치 {start}-{end}: {e}")
                failed_batches.append((start, end))

    if failed_batches:
        print(f"\n[재시도] 실패 배치 {len(failed_batches)}건 순차 재시도...")
        for start, end in failed_batches[:]:
            try:
                rows = _fetch_batch(api_key, start, end, category)
                all_rows.extend(rows)
                failed_batches.remove((start, end))
                print(f"  [복구 성공] 배치 {start}-{end} | {len(rows)}건")
                time.sleep(REQUEST_DELAY)
            except Exception as e:
                print(f"  [복구 실패] 배치 {start}-{end}: {e}")

    if output_dir is None:
        output_dir = str(Path(__file__).resolve().parent.parent.parent / "data")
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    output_path = Path(output_dir) / f"{category}_raw.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_rows, f, ensure_ascii=False, indent=2)

    result = CollectResult(
        total_expected=total,
        total_collected=len(all_rows),
        failed_batches=failed_batches,
    )

    print(f"\n[수집 완료] 예상: {result.total_expected:,}건 | 수집: {result.total_collected:,}건")
    if failed_batches:
        print(f"[경고] 실패 배치: {failed_batches}")
    else:
        print("[성공] 모든 배치 수집 완료")
    print(f"[저장] {output_path}")

    return result


if __name__ == "__main__":
    collect()
