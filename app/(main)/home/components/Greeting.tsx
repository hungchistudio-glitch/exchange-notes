function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export default function Greeting({
  name,
}: {
  name?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-sm uppercase tracking-[0.18em] text-[#768B6F]">
        {getGreeting()}
      </div>

      <h1 className="text-[36px] font-semibold tracking-[-0.05em] text-[#2F312D]">
        {name || "Friend"} 🌿
      </h1>
    </div>
  );
}
