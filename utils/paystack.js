import Paystack from "paystack-api";

const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY);
export default paystack;
