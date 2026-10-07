import Image from "next/image";
import { useFormatter } from "next-intl";

export function WikibitIcon({ className = "size-4" }: { className?: string }) {
  return (
    <Image
      src="/wikibit.svg"
      alt=""
      width={512}
      height={512}
      draggable={false}
      className={`select-none ${className}`}
    />
  );
}

export function Wikibits({
  amount,
  className = "",
  iconClass = "size-[1em]",
}: {
  amount: number;
  className?: string;
  iconClass?: string;
}) {
  const format = useFormatter();
  return (
    <span className={`inline-flex items-center gap-1.5 tabular-nums ${className}`}>
      <WikibitIcon className={`${iconClass} shrink-0`} />
      {format.number(amount)}
    </span>
  );
}
