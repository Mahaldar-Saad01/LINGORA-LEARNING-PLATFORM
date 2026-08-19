// const colors = ['#2e7d32', '#a7f3a0', '#f7c85f', '#5b8def', '#ef6c68', '#9b6bd3']

// const particles = Array.from({ length: 100 }, (_, index) => ({
//   color: colors[index % colors.length],
//   delay: (index % 13) * 0.07,
//   duration: 2.4 + (index % 7) * 0.18,
//   left: ((index * 37)%100) + (index % 3) * 0.2,
//   rotation: (index * 47) % 180,
//   size: 7 + (index % 5) * 2,
// }))

// export default function CelebrationFall() {
//   return (
//     <div aria-hidden="true" className="celebration-fall">
//       {particles.map((particle, index) => (
//         <span
//           className={index % 4 === 0 ? 'celebration-particle celebration-particle-round' : 'celebration-particle'}
//           key={index}
//           style={{
//             '--celebration-color': particle.color,
//             '--celebration-delay': `${particle.delay}s`,
//             '--celebration-duration': `${particle.duration}s`,
//             '--celebration-left': `${particle.left}%`,
//             '--celebration-rotation': `${particle.rotation}deg`,
//             '--celebration-size': `${particle.size}px`,
//           }}
//         />
//       ))}
//     </div>
//   )
// }

const colors = [
  "#2e7d32",
  "#a7f3a0",
  "#f7c85f",
  "#5b8def",
  "#ef6c68",
  "#9b6bd3",
];

const particles = Array.from({ length: 300 }, (_, index) => ({
  color: colors[index % colors.length],
  delay: (index % 13) * 0.02,
  duration: 1.4 + (index % 7) * 0.1,
  left: ((index * 37) % 96) + 2,
  rotation: (index * 20) % 180,
  size: 7 + (index % 5) * 2,
}));

export default function CelebrationFall() {
  return (
    <>
      <style>
        {`
          .celebration-fall {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            pointer-events: none;
            z-index: 9999;
          }

          .celebration-particle {
            position: absolute;

            /* Every particle starts above the screen */
            top: -30px;
            left: var(--celebration-left);

            width: var(--celebration-size);
            height: calc(var(--celebration-size) * 0.6);

            background-color: var(--celebration-color);

            animation-name: particle-fall-from-top;
            animation-duration: var(--celebration-duration);
            animation-delay: var(--celebration-delay);
            animation-timing-function: linear;

            /* Prevent it from starting again */
            animation-iteration-count: 1;
            animation-fill-mode: both;

            opacity: 0;
          }

          .celebration-particle-round {
            height: var(--celebration-size);
            border-radius: 50%;
          }

          @keyframes particle-fall-from-top {
            0% {
              opacity: 0.5;
              transform: translateY(0) rotate(0deg);
            }

            100% {
              opacity: 0.5;
              transform:
                translateY(calc(100vh + 60px))
                rotate(var(--celebration-rotation));
            }
          }
        `}
      </style>

      <div aria-hidden="true" className="celebration-fall">
        {particles.map((particle, index) => (
          <span
            key={index}
            className={
              index % 4 === 0
                ? "celebration-particle celebration-particle-round"
                : "celebration-particle"
            }
            style={{
              "--celebration-color": particle.color,
              "--celebration-delay": `${particle.delay}s`,
              "--celebration-duration": `${particle.duration}s`,
              "--celebration-left": `${particle.left}%`,
              "--celebration-rotation": `${particle.rotation}deg`,
              "--celebration-size": `${particle.size}px`,
            }}
          />
        ))}
      </div>
    </>
  );
}