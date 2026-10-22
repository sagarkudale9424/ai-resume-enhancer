// Tiny, safe Markdown renderer for AI replies: headings, bullet/numbered lists,
// **bold**, *italic* and `code`. Never uses dangerouslySetInnerHTML.

function inline(text, keyBase) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g);
  return parts.map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(part)) return <code key={key} className="px-1 py-0.5 rounded bg-black/30 text-[0.9em]">{part.slice(1, -1)}</code>;
    if (/^\*[^*\s][^*]*\*$/.test(part)) return <em key={key}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export default function Markdown({ text }) {
  const blocks = [];
  let list = null;
  const flush = () => { if (list) { blocks.push(list); list = null; } };

  String(text || '').split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (bullet || numbered) {
      const type = bullet ? 'ul' : 'ol';
      if (!list || list.type !== type) { flush(); list = { type, items: [] }; }
      list.items.push((bullet || numbered)[1]);
      return;
    }
    flush();
    if (heading) blocks.push({ type: 'h', text: heading[1] });
    else if (line.trim()) blocks.push({ type: 'p', text: line });
  });
  flush();

  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        if (b.type === 'h') return <p key={i} className="font-semibold">{inline(b.text, i)}</p>;
        if (b.type === 'p') return <p key={i}>{inline(b.text, i)}</p>;
        const Tag = b.type;
        return (
          <Tag key={i} className={`${Tag === 'ul' ? 'list-disc' : 'list-decimal'} pl-5 space-y-1`}>
            {b.items.map((item, j) => <li key={j}>{inline(item, `${i}-${j}`)}</li>)}
          </Tag>
        );
      })}
    </div>
  );
}
