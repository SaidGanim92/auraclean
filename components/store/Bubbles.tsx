// רקע בועות סבון — CSS טהור. נגישות: כיבוי ב-prefers-reduced-motion ובתפריט הנגישות.
const BUBBLES = [
  { s: '6%', w: 38, d: 19, delay: 0 },
  { s: '16%', w: 64, d: 24, delay: 3 },
  { s: '28%', w: 26, d: 16, delay: 6 },
  { s: '40%', w: 50, d: 22, delay: 1 },
  { s: '52%', w: 34, d: 18, delay: 8 },
  { s: '63%', w: 72, d: 25, delay: 4 },
  { s: '74%', w: 30, d: 17, delay: 10 },
  { s: '83%', w: 56, d: 23, delay: 2 },
  { s: '90%', w: 40, d: 20, delay: 7 },
  { s: '47%', w: 22, d: 15, delay: 12 },
  { s: '34%', w: 60, d: 26, delay: 9 },
  { s: '70%', w: 44, d: 21, delay: 5 },
];

export function Bubbles() {
  return (
    <div className="bubbles" aria-hidden="true">
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="bubble"
          style={{
            insetInlineStart: b.s,
            width: b.w,
            height: b.w,
            animationDuration: `${b.d}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
