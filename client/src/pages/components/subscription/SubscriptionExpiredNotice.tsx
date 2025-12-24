import Button from "../ui/Button";
import { StatusMessage } from "../ui/StatusMessage";

interface Props {
  priceText?: string;
}

export function SubscriptionExpiredNotice({
  priceText = "Базовый тариф на месяц — 5990₽",
}: Props) {
  return (
    <div className="mb-6 flex flex-col items-center justify-center gap-4 text-xl">
      <StatusMessage message={priceText} success={null} />

      <Button
        className="rounded-lg bg-blue-600 px-6 py-3 text-lg font-medium text-white shadow-lg hover:bg-blue-700"
        onClick={() =>
          window.open(
            "mailto:support@priceanalyst.ru?subject=Запрос%20счета%20на%20тариф",
            "_blank",
          )
        }
      >
        Запросить счет
      </Button>
    </div>
  );
}
