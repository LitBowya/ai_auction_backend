import Artwork from "../models/Artwork.js";

export const isOwner = async (req, res, next) => {
  const artwork = await Artwork.findById(req.params.id);

  if (!artwork) {
    return res.status(404).json({ message: "Artwork not found" });
  }

  if (artwork.owner.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json({ message: "Not authorized to modify this artwork" });
  }

  next();
};
