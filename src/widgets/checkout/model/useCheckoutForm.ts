import { useForm } from "react-hook-form";

export type CheckoutFormValues = {
  comment: Record<number, string>;
  [key: string]: any;
};

export const useCheckoutForm = () => {
  return useForm<CheckoutFormValues>({
    defaultValues: {
      comment: {},
    },
  });
};
