interface RoundStartProps {
  startingPlayerName: string;
  round: number;
}

export default function RoundStart({ startingPlayerName, round }: RoundStartProps) {
  return (
    <div className="screen">
      <div className="card round-start">
        <p className="subtitle">Round {round}</p>
        <p className="big-name">{startingPlayerName}</p>
        <p className="subtitle">begins!</p>
      </div>
    </div>
  );
}
