type Props = {
  due: number;
};

export default function LearningCoach({
  due,
}: Props) {

  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 18
      ? "Good afternoon"
      : "Good evening";

  const reviewMinutes = Math.max(
    1,
    Math.ceil(due / 4)
  );

  return (
    <section className="mb-8 rounded-3xl bg-black p-7 text-white">

      <p className="text-sm text-neutral-400">
        {greeting}
      </p>

      <h2 className="mt-2 text-3xl font-bold">
        Today's Focus
      </h2>

      <div className="mt-6 space-y-3">

        <div className="flex justify-between">

          <span>Words to review</span>

          <span className="font-semibold">
            {due}
          </span>

        </div>

        <div className="flex justify-between">

          <span>Estimated time</span>

          <span className="font-semibold">
            {reviewMinutes} min
          </span>

        </div>

      </div>

    </section>
  );
}
