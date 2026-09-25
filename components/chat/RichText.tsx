import { useEffect, useMemo, useState } from 'react';
import { Text, type TextStyle } from 'react-native';

import { colors, fonts } from '@/constants/theme';

type Kind = 'plain' | 'bold' | 'italic';
interface Token {
  text: string;
  kind: Kind;
}

/** Splits `**bold**` / `*italic*` markdown into word tokens (keeping spaces). */
function tokenize(src: string): Token[] {
  const out: Token[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const push = (text: string, kind: Kind) => {
    for (const w of text.split(/(\s+)/)) if (w) out.push({ text: w, kind });
  };
  while ((m = re.exec(src))) {
    if (m.index > last) push(src.slice(last, m.index), 'plain');
    const raw = m[0];
    if (raw.startsWith('**')) push(raw.slice(2, -2), 'bold');
    else push(raw.slice(1, -1), 'italic');
    last = m.index + raw.length;
  }
  if (last < src.length) push(src.slice(last), 'plain');
  return out;
}

const kindStyle: Record<Kind, TextStyle> = {
  plain: {},
  bold: { fontFamily: fonts.sansSemi, color: colors.ink },
  // Editorial flourish: emphasis switches to the serif italic, slightly larger.
  italic: { fontFamily: fonts.serifItalic, fontSize: 19, color: colors.ink },
};

/**
 * Assistant text. When `stream` is on, words appear one by one with a fading
 * tail, like a live token stream, then `onDone` fires.
 */
export function RichText({
  text,
  stream = false,
  onDone,
  size = 16,
  color = colors.dim,
}: {
  text: string;
  stream?: boolean;
  onDone?: () => void;
  size?: number;
  color?: string;
}) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const [shown, setShown] = useState(stream ? 0 : tokens.length);

  useEffect(() => {
    if (!stream) {
      setShown(tokens.length);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= tokens.length) {
        clearInterval(id);
        onDone?.();
      }
    }, 18);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, tokens]);

  const visible = tokens.slice(0, shown);
  return (
    <Text
      style={{
        fontFamily: fonts.sans,
        fontSize: size,
        lineHeight: Math.round(size * 1.55),
        color,
      }}>
      {visible.map((t, i) => {
        const fromEnd = visible.length - i;
        const fading = stream && shown < tokens.length && fromEnd <= 6;
        return (
          <Text key={i} style={[kindStyle[t.kind], fading && { opacity: fromEnd / 7 }]}>
            {t.text}
          </Text>
        );
      })}
    </Text>
  );
}
