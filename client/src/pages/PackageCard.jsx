import { Rating } from "@mui/material";
import React, { useEffect, useState } from "react";
import { FaClock } from "react-icons/fa";
import { Link } from "react-router-dom";

const PackageCard = ({ packageData }) => {
  return (
    <Link to={`/package/${packageData._id}`} className="w-full">
      <div className="w-full bg-white border flex flex-col items-center p-3 rounded shadow-md overflow-hidden">
        <img
          className="w-full h-[220px] rounded border hover:scale-110  transition-all duration-300"
          src={packageData.packageImages[0]}
          alt="Package Image"
        />
        <div className="w-full flex flex-col my-2">
          <p className="font-semibold text-lg capitalize w-[90%] xsm:w-[250px] truncate">
            {packageData.packageName}
          </p>
          <p className="text-green-700 text-lg capitalize">
            {packageData.packageDestination}
          </p>
          {(+packageData.packageDays > 0 || +packageData.packageNights > 0) && (
            <p className="flex text-lg items-center gap-2">
              <FaClock />
              {+packageData.packageDays > 0 &&
                (+packageData.packageDays > 1
                  ? packageData.packageDays + " Days"
                  : packageData.packageDays + " Day")}
              {+packageData.packageDays > 0 &&
                +packageData.packageNights > 0 &&
                " - "}
              {+packageData.packageNights > 0 &&
                (+packageData.packageNights > 1
                  ? packageData.packageNights + " Nights"
                  : packageData.packageNights + " Night")}
            </p>
          )}
          {/* price & rating */}
          <div className="flex flex-wrap justify-between">
            {packageData.packageTotalRatings > 0 && (
              <p className="flex items-center text-lg">
                <Rating
                  value={packageData.packageRating}
                  size="medium"
                  readOnly
                  precision={0.1}
                />
                ({packageData.packageTotalRatings})
              </p>
            )}
            {packageData.offer && packageData.packageDiscountPrice ? (
              <div className="flex items-center gap-2">
                <span className="line-through text-gray-400">
                  ₹{packageData.packagePrice}
                </span>
                <span className="font-semibold">
                  ₹{packageData.packageDiscountPrice}
                </span>
              </div>
            ) : (
              <span className="font-semibold">
                ₹{packageData.packagePrice}
              </span>
            )}
          </div>
          {/* price & rating */}
        </div>
      </div>
    </Link>
  );
};

export default PackageCard;
