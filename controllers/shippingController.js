import Shipping from "../models/Shipping.js";

/**
 * 🔹 Set Shipping Details for an Auction
 */
export const setShippingDetails = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { name, address, city, postalCode, contactNumber, isDefault } =
      req.body;

    // Check if shipping details already exist for this auction
    const existingShipping = await Shipping.findOne({ auction: auctionId });
    if (existingShipping) {
      return res.status(400).json({
        success: false,
        message: "Shipping details already exist for this auction.",
      });
    }

    // Create new shipping details
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

    // Return success response
    res.status(201).json({
      success: true,
      message: "Shipping details set successfully",
      shipping,
    });
  } catch (error) {
    console.error("[ERROR] Error setting shipping details:", error.message);
    res.status(500).json({
      success: false,
      message: "Error setting shipping details",
      error: error.message,
    });
  }
};

/**
 * 🔹 Get Default Shipping Details for the Buyer
 */
export const getDefaultShipping = async (req, res) => {
  try {
    // Find the default shipping details for the buyer
    const shipping = await Shipping.findOne({
      buyer: req.user._id,
      isDefault: true,
    });

    // If no default shipping details found, return a 404 error
    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "No default shipping details found",
      });
    }

    // Return the default shipping details
    res.status(200).json({
      success: true,
      message: "Default shipping details retrieved successfully",
      shipping,
    });
  } catch (error) {
    console.error("[ERROR] Error fetching default shipping:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching default shipping",
      error: error.message,
    });
  }
};
