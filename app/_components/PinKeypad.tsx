"use client";

import { useEffect, useState } from "react";

type Props = {
  disabled?: boolean;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
};

function shuffledDigits() {
  const digits = Array.from({ length: 10 }, (_, digit) => String(digit));
  for (let index = digits.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [digits[index], digits[swapIndex]] = [digits[swapIndex], digits[index]];
  }
  return digits;
}

export default function PinKeypad({ disabled = false, onDigit, onBackspace, onClear }: Props) {
  const [digits, setDigits] = useState<string[] | null>(null);

  useEffect(() => {
    setDigits(shuffledDigits());
  }, []);

  return (
    <div className="mt-4 grid grid-cols-3 gap-2" aria-label="PIN keypad">
      {digits?.map((digit) => (
        <button
          key={digit}
          type="button"
          onClick={() => onDigit(digit)}
          disabled={disabled}
          aria-label={`Enter ${digit}`}
          className="home-return-key"
        >
          {digit}
        </button>
      ))}
      <button type="button" onClick={onClear} disabled={disabled} className="home-return-key text-sm">
        Clear
      </button>
      <button
        type="button"
        onClick={onBackspace}
        disabled={disabled}
        aria-label="Delete last digit"
        className="home-return-key text-xl"
      >
        ⌫
      </button>
    </div>
  );
}
