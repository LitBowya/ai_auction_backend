import Shipping from "../models/Shipping.js";

export const setShippingDetails = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { name, address, city, postalCode, contactNumber, isDefault } =
      req.body;

    const existingShipping = await Shipping.findOne({ auction: auctionId });
    if (existingShipping) {
      return res
        .status(400)
        .json({ message: "Shipping details already exist for this auction." });
    }

    const shipping = await Shipping.create({
      buyer: req.user._id,
      auction: auctionId,
      name,
      address,
      city,
      postalCode,
      contactNumber,
      isDefault,
    });

    // If the buyer sets this as default, update their other shipping records
    if (isDefault) {
      await Shipping.updateMany(
        { buyer: req.user._id, _id: { $ne: shipping._id } },
        { isDefault: false }
      );
    }

    res
      .status(201)
      .json({ message: "Shipping details set successfully", shipping });
  } catch (error) {
    res.status(500).json({
      message: "Error setting shipping details",
      error: error.message,
    });
  }
};

export const getDefaultShipping = async (req, res) => {
  try {
    const shipping = await Shipping.findOne({
      buyer: req.user._id,
      isDefault: true,
    });

    if (!shipping) {
      return res
        .status(404)
        .json({ message: "No default shipping details found" });
    }

    res.status(200).json({ shipping });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching default shipping",
      error: error.message,
    });
  }
};
