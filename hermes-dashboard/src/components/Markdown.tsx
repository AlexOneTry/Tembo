import { memo, useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownProps {
  content: string;
}

/**
 * Лёгкий markdown-рендер: заголовки, списки, таблицы, code-fences,
 * inline-код, жирный/курсив, ссылки. Без внешней зависимости — чтобы
 * не тащить shiki/prism в стартовый бандл (можно подключить позже).
 */
export const Markdown = memo(function Markdown({ content }: MarkdownProps) {
  const blocks = parse(content);
  return (
    <div className="space-y-3 leading-relaxed text-[14px]">
      {blocks.map((b, i) => renderBlock(b, i))}
    </div>
  );
});

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; level: 1 | 2 | 3; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'code'; lang?: string; text: string }
  | { kind: 'table'; head: string[]; rows: string[][] };

function parse(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out: Block[] = [];
  let i = 0;
  const flushBuf = (buf: string[]) => {
    if (buf.length) out.push({ kind: 'p', text: buf.join(' ').trim() });
  };
  let buf: string[] = [];
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      flushBuf(buf);
      buf = [];
      const lang = line.slice(3).trim() || undefined;
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      out.push({ kind: 'code', lang, text: code.join('\n') });
      continue;
    }

    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flushBuf(buf);
      buf = [];
      out.push({ kind: 'h', level: h[1].length as 1 | 2 | 3, text: h[2] });
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushBuf(buf);
      buf = [];
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      out.push({ kind: 'ul', items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      flushBuf(buf);
      buf = [];
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push({ kind: 'ol', items });
      continue;
    }

    // table
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s\-:|]+\|\s*$/.test(lines[i + 1])) {
      flushBuf(buf);
      buf = [];
      const head = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push({ kind: 'table', head, rows });
      continue;
    }

    if (line.trim() === '') {
      flushBuf(buf);
      buf = [];
      i++;
      continue;
    }

    buf.push(line);
    i++;
  }
  flushBuf(buf);
  return out;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());
}

function renderBlock(b: Block, key: number) {
  switch (b.kind) {
    case 'p':
      return (
        <p key={key} className="text-primary">
          <Inline text={b.text} />
        </p>
      );
    case 'h': {
      const sizes = { 1: 'text-xl', 2: 'text-lg', 3: 'text-base' } as const;
      const Tag = (`h${b.level}` as 'h1' | 'h2' | 'h3');
      return (
        <Tag key={key} className={`${sizes[b.level]} font-semibold text-primary`}>
          <Inline text={b.text} />
        </Tag>
      );
    }
    case 'ul':
      return (
        <ul key={key} className="list-disc ml-5 space-y-1 text-primary">
          {b.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol key={key} className="list-decimal ml-5 space-y-1 text-primary">
          {b.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </ol>
      );
    case 'code':
      return <CodeBlock key={key} text={b.text} lang={b.lang} />;
    case 'table':
      return (
        <div key={key} className="overflow-x-auto rounded-lg border border-default">
          <table className="w-full text-sm">
            <thead className="bg-app">
              <tr>
                {b.head.map((h, i) => (
                  <th key={i} className="text-left px-3 py-2 font-medium text-secondary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, r) => (
                <tr key={r} className="border-t border-default">
                  {row.map((cell, c) => (
                    <td key={c} className="px-3 py-2 text-primary">
                      <Inline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function CodeBlock({ text, lang }: { text: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-xl border border-default overflow-hidden bg-app">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-default bg-card">
        <span className="text-[11px] uppercase tracking-wider text-muted font-mono">
          {lang ?? 'code'}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 text-[11px] text-secondary hover:text-primary transition"
          aria-label="Скопировать код"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>
      <pre className="px-3 py-2.5 text-[12.5px] font-mono overflow-x-auto leading-relaxed text-primary">
        {text}
      </pre>
    </div>
  );
}

function Inline({ text }: { text: string }) {
  // very small inline parser: `code`, **bold**, *italic*, [link](url)
  const nodes: React.ReactNode[] = [];
  let rest = text;
  let key = 0;
  const patterns: Array<{
    re: RegExp;
    render: (m: RegExpExecArray) => React.ReactNode;
  }> = [
    {
      re: /`([^`]+)`/,
      render: (m) => (
        <code
          key={key++}
          className="font-mono text-[12.5px] px-1 py-0.5 rounded bg-card border border-default"
        >
          {m[1]}
        </code>
      ),
    },
    {
      re: /\*\*([^*]+)\*\*/,
      render: (m) => (
        <strong key={key++} className="font-semibold">
          {m[1]}
        </strong>
      ),
    },
    {
      re: /\*([^*]+)\*/,
      render: (m) => (
        <em key={key++} className="italic">
          {m[1]}
        </em>
      ),
    },
    {
      re: /\[([^\]]+)\]\(([^)]+)\)/,
      render: (m) => (
        <a
          key={key++}
          href={m[2]}
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          {m[1]}
        </a>
      ),
    },
  ];

  while (rest.length) {
    let best: { idx: number; len: number; node: React.ReactNode } | null = null;
    for (const p of patterns) {
      const m = p.re.exec(rest);
      if (m && (best === null || m.index < best.idx)) {
        best = { idx: m.index, len: m[0].length, node: p.render(m) };
      }
    }
    if (!best) {
      nodes.push(rest);
      break;
    }
    if (best.idx > 0) nodes.push(rest.slice(0, best.idx));
    nodes.push(best.node);
    rest = rest.slice(best.idx + best.len);
  }
  return <>{nodes}</>;
}
