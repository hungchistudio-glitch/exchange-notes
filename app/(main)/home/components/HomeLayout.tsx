import type { ReactNode } from "react";

type Props = {
  greeting: ReactNode;
  hero: ReactNode;
  actions: ReactNode;
  review: ReactNode;
  recent: ReactNode;
};

export default function HomeLayout({
  greeting,
  hero,
  actions,
  review,
  recent,
}: Props) {
  return (
    <div className="space-y-7">

      {greeting}

      {hero}

      {actions}

      {review}

      {recent}

    </div>
  );
}
