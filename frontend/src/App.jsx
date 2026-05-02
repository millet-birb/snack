import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = "http://127.0.0.1:8000/api";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await axios.get(`${API_BASE}/stats`);
        const productsRes = await axios.get(`${API_BASE}/products`);

        setStats(statsRes.data);
        setProducts(productsRes.data.products);
      } catch (error) {
        console.error("API 호출 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div style={{ padding: "24px" }}>로딩 중...</div>;
  }

  return (
    <div style={{ padding: "24px", fontFamily: "sans-serif" }}>
      <h1>두쫀쿠가고 버터떡왔다</h1>
      <p>질환 아동 안심 과자 추천 서비스</p>

      {stats && (
        <div style={{ marginBottom: "24px" }}>
          <h2>통계</h2>
          <p>제품 수: {stats.product_count}</p>
          <p>질환 수: {stats.condition_count}</p>
          <p>맛 태그 수: {stats.taste_count}</p>
        </div>
      )}

      <div>
        <h2>추천 제품</h2>
        {products.map((product) => (
          <div
            key={product.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "12px",
            }}
          >
            <h3>{product.name}</h3>
            <p>브랜드: {product.brand}</p>
            <p>가격: {product.price}원</p>
            <p>영양 점수: {product.nutrition_score}</p>
            <p>맛 태그: {product.taste_tags.join(", ")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;