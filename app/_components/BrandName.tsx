const waveY = [0, -0.035, -0.05, 0.02, 0.04, -0.015];
const waveRotation = [-0.8, 0.4, 1, -0.5, 0.7, -0.8];

export default function BrandName({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <span className={`brand-name inline-block ${className}`}>
      <span className="brand-name-visual">
        {Array.from(name).map((character, index) =>
          character === " " ? (
            " "
          ) : (
            <span
              key={index}
              className="brand-name-letter"
              style={{
                transform: `translateY(${waveY[index % waveY.length]}em) rotate(${waveRotation[index % waveRotation.length]}deg)`,
              }}
            >
              {character}
            </span>
          )
        )}
      </span>
    </span>
  );
}
