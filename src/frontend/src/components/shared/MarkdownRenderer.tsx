import { cn } from "@/lib/utils";
import {
  type ElementType,
  Fragment,
  type ReactNode,
  isValidElement,
} from "react";

interface MarkdownRendererProps {
  /** Raw markdown source to render. */
  content: string;
  className?: string;
  /** Stable marker id for the rendered container. */
  ocid?: string;
}

/**
 * Lightweight markdown renderer (no external dependency).
 * Supports: headings (h1-h4), bold, italic, inline code, fenced code blocks,
 * ordered/unordered lists, blockquotes, links, paragraphs, and horizontal rules.
 * Styled with OKLCH design tokens via Tailwind + the `prose` typography plugin.
 */
export function MarkdownRenderer({
  content,
  className,
  ocid = "markdown",
}: MarkdownRendererProps) {
  const blocks = parseBlocks(content);
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-headings:font-display prose-headings:scroll-mt-20",
        "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base",
        "prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-muted/60 prose-pre:text-foreground prose-pre:border prose-pre:border-border",
        "prose-blockquote:border-l-primary prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
        "prose-li:marker:text-muted-foreground",
        "prose-hr:border-border",
        className,
      )}
      data-ocid={ocid}
    >
      {blocks.map((block, i) => (
        <BlockNode key={i} block={block} />
      ))}
    </div>
  );
}

/* ----------------------------- Block parsing ----------------------------- */

type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "quote"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "hr" }
  | { type: "paragraph"; text: string };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line — skip.
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Fenced code block.
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      const lang = fence[1] ?? "";
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // consume closing fence
      blocks.push({ type: "code", lang, code: code.join("\n") });
      continue;
    }

    // Horizontal rule.
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Heading.
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3 | 4;
      blocks.push({ type: "heading", level, text: heading[2].trim() });
      i++;
      continue;
    }

    // Blockquote (consecutive lines).
    if (line.trim().startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }

    // Unordered list.
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list.
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Paragraph (consume until blank line or block boundary).
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("```") &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*([-*_])\1{2,}\s*$/.test(lines[i]) &&
      !lines[i].trim().startsWith(">") &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: para.join(" ") });
  }

  return blocks;
}

/* ----------------------------- Block rendering ---------------------------- */

function BlockNode({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": {
      const Tag = `h${block.level}` as ElementType;
      return <Tag>{renderInline(block.text)}</Tag>;
    }
    case "code":
      return (
        <pre className="overflow-x-auto rounded-lg p-4 text-sm">
          {block.lang && (
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              {block.lang}
            </div>
          )}
          <code className="font-mono">{block.code}</code>
        </pre>
      );
    case "quote":
      return <blockquote>{renderInline(block.text)}</blockquote>;
    case "ul":
      return (
        <ul>
          {block.items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol>
          {block.items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ol>
      );
    case "hr":
      return <hr />;
    default:
      return <p>{renderInline(block.text)}</p>;
  }
}

/* ----------------------------- Inline parsing ----------------------------- */

/**
 * Parse a single line of inline markdown into React nodes.
 * Supports: `code`, **bold**, *italic*, [text](href), and plain text.
 * Uses a token-scan approach to avoid nested-regex pitfalls.
 */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let key = 0;

  while (rest.length > 0) {
    // Inline code: `...`
    const codeMatch = rest.match(/^`([^`]+)`/);
    if (codeMatch) {
      nodes.push(
        <code key={key++} className="font-mono">
          {codeMatch[1]}
        </code>,
      );
      rest = rest.slice(codeMatch[0].length);
      continue;
    }

    // Bold: **...**
    const boldMatch = rest.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      nodes.push(<strong key={key++}>{boldMatch[1]}</strong>);
      rest = rest.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *...*
    const italicMatch = rest.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      nodes.push(<em key={key++}>{italicMatch[1]}</em>);
      rest = rest.slice(italicMatch[0].length);
      continue;
    }

    // Link: [text](href)
    const linkMatch = rest.match(/^\[([^\]]+)\]\(([^)\s]+)\)/);
    if (linkMatch) {
      const href = linkMatch[2];
      const safe = /^(https?:|mailto:|\/|#)/i.test(href) ? href : "#";
      nodes.push(
        <a
          key={key++}
          href={safe}
          target={safe.startsWith("http") ? "_blank" : undefined}
          rel={safe.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {linkMatch[1]}
        </a>,
      );
      rest = rest.slice(linkMatch[0].length);
      continue;
    }

    // Plain text up to the next special char.
    const next = rest.search(/[`*\[]/);
    if (next === -1) {
      nodes.push(<Fragment key={key++}>{rest}</Fragment>);
      break;
    }
    if (next > 0) {
      nodes.push(<Fragment key={key++}>{rest.slice(0, next)}</Fragment>);
      rest = rest.slice(next);
    } else {
      // next === 0 but no token matched (e.g. a lone `*`); emit one char to progress.
      nodes.push(<Fragment key={key++}>{rest[0]}</Fragment>);
      rest = rest.slice(1);
    }
  }

  // Flatten single-element arrays for cleaner React output.
  return nodes.length === 1 && isValidElement(nodes[0]) ? nodes : nodes;
}
