"use client";
import { useState } from "react";

export default function Planning() {
  const [plans] = useState<string[]>([
    "Trip to Hampi",
    "Jaipur in Summer",
  ]);

  return (
    <div className="p-6 bg-white rounded-xl shadow-md w-full">
      <h2 className="text-2xl font-bold text-amber-900 mb-4">Your Planning</h2>
      <ul className="list-disc list-inside text-amber-700">
        {plans.map((plan, i) => (
          <li key={i}>{plan}</li>
        ))}
      </ul>
    </div>
  );
}
