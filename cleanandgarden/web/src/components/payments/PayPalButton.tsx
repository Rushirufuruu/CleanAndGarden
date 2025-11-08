"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";

type Props = {
  amount: string;           // monto en la moneda especificada
  currency: string;         // ej: "CLP", "USD"
  description: string;      // ej: "Servicio de jardinería"
  onApproved: (orderId: string) => Promise<void> | void; // callback al aprobar
};

export default function PayPalButton({ amount, currency, description, onApproved }: Props) {
  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        currency: currency,
      }}
    >
      <PayPalButtons
        style={{ layout: "vertical", label: "pay" }}
        createOrder={(_, actions) =>
          actions.order.create({
            intent: "CAPTURE",
            purchase_units: [{ amount: { currency_code: currency, value: amount }, description }],
          })
        }
        onApprove={async (data, actions) => {
          const details = await actions.order!.capture();
          // orderID util para notificar al backend
          await onApproved(data.orderID!);
          console.log("Pago OK:", details);
        }}
        onError={(err) => {
          console.error("Error PayPal:", err);
          alert("Hubo un problema al procesar el pago.");
        }}
      />
    </PayPalScriptProvider>
  );
}
