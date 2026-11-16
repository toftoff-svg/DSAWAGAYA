export default function BestSellerStar({
  className = "ml-1",
  title = "Best seller",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={className}
      style={{ color: "#D4A017" }}
      title={title}
      aria-label="Best seller"
    >
      ★
    </span>
  );
}
