export default function MessageBubble({ role, content }) {
  const isUser = role === 'user';

  let displayContent = content;
  if (isUser && content.includes('<document>')) {
    const match = content.match(/My question: ([\s\S]+)$/);
    displayContent = match ? match[1] : content;
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mr-2 mt-1">
          AI
        </div>
      )}
      <div
        className={`
          max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
          }
        `}
      >
        {displayContent}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0 ml-2 mt-1">
          You
        </div>
      )}
    </div>
  );
}
