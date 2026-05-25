'use client';

// 화면 우측 하단에 떠 있는 채팅 위젯.
// 곰돌선생 아이콘 버튼을 누르면 대화창이 열리고, 백엔드의 /api/chat 으로 메시지를 주고받는다.

import { useEffect, useRef, useState } from 'react';
import { X, Send } from 'lucide-react';

// 백엔드 주소. .env.local 의 NEXT_PUBLIC_BACKEND_URL 을 사용한다.
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

// 메시지 한 개의 형태: 누가(role) 무슨 말(content)을 했는지.
type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

// 대화창을 처음 열었을 때 보여줄 인사말.
const GREETING: ChatMessage = {
  role: 'assistant',
  content: '안녕하세요! 영양사 곰돌 선생이에요 ! 아이에게 안전한 간식 고르기를 도와드릴게요. 무엇이든 물어보세요 🙂',
};

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);          // 대화창 열림/닫힘
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]); // 대화 기록
  const [input, setInput] = useState('');               // 입력창의 현재 글자
  const [loading, setLoading] = useState(false);        // 답변 기다리는 중인지

  // 새 메시지가 생기면 대화창을 맨 아래로 자동 스크롤하기 위한 참조.
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // 메시지를 백엔드로 보내고 답변을 받는다.
  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return; // 빈 입력이거나 답변 대기 중이면 무시

    const userMessage: ChatMessage = { role: 'user', content: text };
    const history = messages; // 지금까지의 대화 (이번 메시지 보내기 전 상태)

    setMessages([...history, userMessage]); // 내 메시지를 화면에 먼저 표시
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });
      if (!res.ok) throw new Error('서버 응답 오류');

      const data = await res.json();
      const botMessage: ChatMessage = { role: 'assistant', content: data.reply };
      setMessages([...history, userMessage, botMessage]);
    } catch {
      // 통신 실패 시 사용자에게 친절하게 안내.
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '죄송해요, 답변을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.',
      };
      setMessages([...history, userMessage, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  // 입력창에서 Enter 키를 누르면 전송 (Shift+Enter 는 줄바꿈).
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* 1) 닫혀 있을 때 보이는 곰돌선생 아이콘 버튼 */}
      {!isOpen && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
          {/* 말풍선 */}
          <div className="relative bg-white rounded-2xl px-3 py-2 shadow-md border text-xs font-medium text-gray-700 whitespace-nowrap">
            저를 클릭하세요! 🍪
            {/* 말풍선 꼬리 */}
            <div className="absolute -bottom-2 right-5 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white" />
          </div>
          <button
            onClick={() => setIsOpen(true)}
            aria-label="간식 도우미 열기"
            className="flex h-25 w-25 items-center justify-center rounded-full bg-rose-300 shadow-lg transition-transform hover:scale-105 overflow-hidden"
          >
            <img
              src="/product-images/곰돌선생.png"
              alt="곰돌선생"
              width={80}
              height={80}
              className="h-full w-full object-cover"
              style={{ imageRendering: 'pixelated' }}
            />
          </button>
        </div>
      )}

      {/* 2) 열려 있을 때 보이는 대화창 */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[70vh] max-h-[520px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
          {/* 헤더 */}
          <div className="flex items-center justify-between bg-rose-400 px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white shrink-0">
                <img
                  src="/product-images/곰돌선생.png"
                  alt="곰돌선생"
                  width={50}
                  height={50}
                  className="h-full w-full object-cover"
                  style={{ imageRendering: 'pixelated',transform: 'scaleX(-1)' }}
                />
              </div>
              <span className="font-semibold">영양사 곰돌 선생</span>
            </div>
            <button onClick={() => setIsOpen(false)} aria-label="닫기">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 메시지 목록 */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={
                    'max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ' +
                    (m.role === 'user'
                      ? 'bg-rose-400 text-primary-foreground'
                      : 'bg-muted text-foreground')
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* 답변 대기 중 표시 */}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  답변을 작성하는 중…
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div className="flex items-center gap-2 border-t bg-card p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="예) 새우 알레르기가 있는 아이에게 과자 추천해줘!"
              className="flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="전송"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
