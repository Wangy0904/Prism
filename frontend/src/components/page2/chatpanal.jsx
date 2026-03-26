import { useState, useEffect, useRef } from "react";
import "./ChatPanal.css";

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`chat-bubble chat-bubble--${isUser ? "user" : "assistant"}`}>
      {message.type === "image" ? (
        <img src={message.content} alt="生成图片" className="chat-bubble__image" />
      ) : (
        <span className="chat-bubble__text">{message.content}</span>
      )}
    </div>
  );
}

export default function ChatPanel({
  activeConcept,
  chatHistory,
  onSend,
  prefillText,
  onClearPrefill,
}) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (prefillText) {
      setInput(prefillText);
      onClearPrefill?.();
    }
  }, [prefillText, onClearPrefill]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, activeConcept]);

  const currentHistory = activeConcept ? (chatHistory[activeConcept.id] ?? []) : [];

  const handleSend = async () => {
    if (!input.trim() || !activeConcept || isLoading) return;
    const prompt = input.trim();
    setInput("");
    setIsLoading(true);
    await onSend(activeConcept.id, prompt);
    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-panel">
      {/* 1. 顶部标题栏：常态显示 */}
      <div className="chat-panel__header">
        <span className="chat-panel__title">
          {activeConcept ? activeConcept.title : "对话生成"}
        </span>
      </div>

      {/* 2. 中间消息区：根据状态切换内容，但容器常态显示 */}
      <div className={`chat-panel__messages ${!activeConcept ? "chat-panel__messages--centered" : ""}`}>
        {!activeConcept ? (
          /* 未选中时的占位提示 */
          <p className="chat-panel__hint">
            请先在中间列生成或选择一个方案<br/>以开启 AI 绘图对话
          </p>
        ) : (
          /* 选中后的真实对话列表 */
          <>
            {currentHistory.length === 0 ? (
              <p className="chat-panel__hint">
                输入提示词，生成与「{activeConcept.title}」相关的图片
              </p>
            ) : (
              currentHistory.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))
            )}
            {isLoading && (
              <div className="chat-panel__loading">
                <span /><span /><span />
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 3. 底部输入区：常态显示 */}
      <div className="chat-panel__input-area">
        <textarea
          className="chat-panel__textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={activeConcept ? "请输入图片生成提示词..." : "请先选择一个方案"}
          disabled={!activeConcept || isLoading} // 没选中时禁用，防止误发
          rows={3}
        />
        <button
          className="chat-panel__send-btn"
          onClick={handleSend}
          disabled={!activeConcept || !input.trim() || isLoading}
        >
          发送
        </button>
      </div>
    </div>
  );

}