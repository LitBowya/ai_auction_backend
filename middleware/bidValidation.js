export const validateBid = (req, res, next) => {
  const { bidAmount } = req.body;

  if (!bidAmount || bidAmount <= 0) {
    return res.status(400).json({ message: "Invalid bid amount" });
  }

  next();
};
