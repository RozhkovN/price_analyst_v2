import { useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import Button from "../ui/Button";

interface ExtendSubscriptionForm {
  email: string;
}

export function ExtendSubscriptionSection() {
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExtendSubscriptionForm>();

  const onSubmit = async (values: ExtendSubscriptionForm) => {
    setResultMessage(null);

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/subscription/grant`,
        {
          email: values.email,
          minutesToAdd: 43200, // 30 дней
        },
      );

      if (data?.success !== false) {
        setResultMessage("Подписка успешно продлена");
        reset();
      } else {
        setResultMessage(data?.message || "Ошибка при продлении подписки");
      }
    } catch (err: any) {
      setResultMessage(
        err?.response?.data?.message || "Ошибка сети или сервера",
      );
    }
  };

  return (
    <div className="my-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-blue-100">
      <h2 className="mb-4 text-lg font-semibold text-blue-900">
        Продлить подписку пользователю
      </h2>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 sm:flex-row sm:items-end"
      >
        <div className="w-full">
          <input
            type="email"
            placeholder="Email пользователя"
            className={`w-full rounded-md border px-3 py-2 text-base focus:ring-2 focus:outline-none ${
              errors.email
                ? "border-red-300 focus:ring-red-200"
                : "border-blue-200 focus:border-blue-400 focus:ring-blue-200"
            }`}
            {...register("email", {
              required: "Введите email",
              pattern: {
                value: /^\S+@\S+\.\S+$/,
                message: "Некорректный email",
              },
            })}
            disabled={isSubmitting}
          />

          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <Button disabled={isSubmitting}>
          {isSubmitting ? "Продление..." : "Продлить на месяц"}
        </Button>
      </form>

      {resultMessage && (
        <div className="mt-3 text-sm text-blue-800">{resultMessage}</div>
      )}
    </div>
  );
}
