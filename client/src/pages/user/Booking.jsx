import React, { useEffect, useState } from "react";
import { FaClock, FaMapMarkerAlt } from "react-icons/fa";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router";
import DropIn from "braintree-web-drop-in-react";
import axios from "axios";

// Configure axios with explicit port
const baseURL = 'http://localhost:8000';
axios.defaults.baseURL = baseURL;
axios.defaults.withCredentials = true;

console.log('Axios configured with base URL:', baseURL);

const Booking = () => {
  const { currentUser } = useSelector((state) => state.user);
  const params = useParams();
  const navigate = useNavigate();
  const [packageData, setPackageData] = useState({
    packageName: "",
    packageDescription: "",
    packageDestination: "",
    packageDays: 1,
    packageNights: 1,
    packageAccommodation: "",
    packageTransportation: "",
    packageMeals: "",
    packageActivities: "",
    packagePrice: 500,
    packageDiscountPrice: 0,
    packageOffer: false,
    packageRating: 0,
    packageTotalRatings: 0,
    packageImages: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [bookingData, setBookingData] = useState({
    totalPrice: 0,
    packageDetails: null,
    buyer: null,
    persons: 1,
    date: null,
  });
  const [clientToken, setClientToken] = useState("");
  const [instance, setInstance] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  const getPackageData = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/package/get-package-data/${params?.packageId}`
      );
      const data = await res.json();
      if (data?.success) {
        setPackageData({
          packageName: data?.packageData?.packageName,
          packageDescription: data?.packageData?.packageDescription,
          packageDestination: data?.packageData?.packageDestination,
          packageDays: data?.packageData?.packageDays,
          packageNights: data?.packageData?.packageNights,
          packageAccommodation: data?.packageData?.packageAccommodation,
          packageTransportation: data?.packageData?.packageTransportation,
          packageMeals: data?.packageData?.packageMeals,
          packageActivities: data?.packageData?.packageActivities,
          packagePrice: data?.packageData?.packagePrice,
          packageDiscountPrice: data?.packageData?.packageDiscountPrice,
          packageOffer: data?.packageData?.packageOffer,
          packageRating: data?.packageData?.packageRating,
          packageTotalRatings: data?.packageData?.packageTotalRatings,
          packageImages: data?.packageData?.packageImages,
        });
        setLoading(false);
      } else {
        setError(data?.message || "Something went wrong!");
        setLoading(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  //get paymentgateway token
  const getToken = async () => {
    try {
      const { data } = await axios.get(`/api/package/braintree/token`);
      setClientToken(data?.clientToken);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    getToken();
  }, [currentUser]);

  //handle payment & book package
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      
      script.onload = () => {
        console.log("Razorpay script loaded successfully");
        resolve(true);
      };
      
      script.onerror = () => {
        console.error("Failed to load Razorpay script");
        resolve(false);
      };
      
      document.body.appendChild(script);
    });
  };
  
  const handleBookPackage = async () => {
    if (!bookingData.date) {
      alert("Please select a date.");
      return;
    }
  
    try {
      setLoading(true);
      console.log("Starting payment process...");
  
      // Load Razorpay script
      console.log("Loading Razorpay script...");
      const loaded = await loadRazorpay();
      if (!loaded) {
        alert("Razorpay SDK failed to load. Are you online?");
        setLoading(false);
        return;
      }
      console.log("Razorpay script loaded successfully");
  
      // Create order
      console.log("Creating order with amount:", bookingData.totalPrice);
      const orderResponse = await axios.post("/api/booking/create-order", {
        amount: bookingData.totalPrice
      });
      
      console.log("Full order response:", orderResponse);
      console.log("Order response data:", orderResponse.data);

      if (!orderResponse.data?.success) {
        console.error("Order creation failed:", orderResponse.data);
        alert(orderResponse.data?.message || "Could not create order");
        setLoading(false);
        return;
      }
  
      const options = {
        key: "rzp_test_5LlH6brMb1ZEZm",
        amount: bookingData.totalPrice * 100, // Amount in paise
        currency: "INR",
        name: "Travel Mate",
        description: `Booking for ${packageData.packageName}`,
        order_id: orderResponse.data.orderId,
        handler: async function (response) {
          console.log("Payment successful, verifying...", response);
          try {
            // Verify payment
            const verifyResponse = await axios.post("/api/booking/verify-payment", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });
            console.log("Verification response:", verifyResponse.data);

            if (verifyResponse.data?.success) {
              console.log("Payment verified, creating booking...");
              // Create booking
              const bookingResponse = await axios.post(
                `/api/booking/book-package/${params?.packageId}`, 
                bookingData
              );
              console.log("Booking response:", bookingResponse.data);

              if (bookingResponse.data?.success) {
                alert("Booking successful!");
                navigate("/profile");
              } else {
                alert(bookingResponse.data?.message || "Booking failed");
              }
            } else {
              alert("Payment verification failed");
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            alert("Payment verification failed");
          }
        },
        prefill: {
          name: currentUser.username,
          email: currentUser.email,
          contact: currentUser.phone
        },
        notes: {
          packageId: params?.packageId,
          persons: bookingData.persons,
          date: bookingData.date
        },
        theme: {
          color: "#3399cc"
        },
        modal: {
          ondismiss: function() {
            console.log("Payment modal closed");
            setLoading(false);
          }
        }
      };
  
      console.log("Initializing Razorpay with options:", options);
      const razorpayInstance = new window.Razorpay(options);
      console.log("Opening Razorpay modal...");
      razorpayInstance.open();
      
    } catch (error) {
      console.error("Payment error:", error);
      if (error.response) {
        console.error("Full error response:", error.response);
        alert(error.response.data?.message || "Payment failed");
      } else {
        alert("Payment failed: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => {
    if (params?.packageId) {
      getPackageData();
    }
    let date = new Date().toISOString().substring(0, 10);
    let d = date.substring(0, 8) + (parseInt(date.substring(8)) + 1);
    setCurrentDate(d);
  }, [params?.packageId]);

  useEffect(() => {
    if (packageData && params?.packageId) {
      setBookingData({
        ...bookingData,
        packageDetails: params?.packageId,
        buyer: currentUser?._id,
        totalPrice: packageData?.packageDiscountPrice
          ? packageData?.packageDiscountPrice * bookingData?.persons
          : packageData?.packagePrice * bookingData?.persons,
      });
    }
  }, [packageData, params]);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-[95%] flex flex-col items-center p-6 rounded shadow-2xl gap-3">
        <h1 className="text-center font-bold text-2xl">Book Package</h1>
        {/* user info */}
        <div className="w-full flex flex-wrap justify-center gap-2">
          <div className="pr-3 md:border-r md:pr-6">
            <div className="flex flex-col p-2 w-64 xsm:w-72 h-fit gap-2">
              <div className="flex flex-col">
                <label htmlFor="username" className="font-semibold">
                  Username:
                </label>
                <input
                  type="text"
                  id="username"
                  className="p-1 rounded border border-black"
                  value={currentUser.username}
                  disabled
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="email" className="font-semibold">
                  Email:
                </label>
                <input
                  type="email"
                  id="email"
                  className="p-1 rounded border border-black"
                  value={currentUser.email}
                  disabled
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="address" className="font-semibold">
                  Address:
                </label>
                <textarea
                  maxLength={200}
                  type="text"
                  id="address"
                  className="p-1 rounded border border-black resize-none"
                  value={currentUser.address}
                  disabled
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="phone" className="font-semibold">
                  Phone:
                </label>
                <input
                  type="text"
                  id="phone"
                  className="p-1 rounded border border-black"
                  value={currentUser.phone}
                  disabled
                />
              </div>
            </div>
          </div>
          {/* package info */}
          <div className="pl-3 md:border-l md:pl-6">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-2">
                <img
                  className="w-28"
                  src={packageData.packageImages[0]}
                  alt="Package image"
                />
                <div>
                  <p className="font-semibold text-lg mb-1 capitalize">
                    {packageData.packageName}
                  </p>
                  <p className="flex gap-2 text-green-700 font-semibold capitalize">
                    <FaMapMarkerAlt /> {packageData.packageDestination}
                  </p>
                  {/* days & nights */}
                  {(+packageData.packageDays > 0 ||
                    +packageData.packageNights > 0) && (
                    <p className="flex items-center gap-2">
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
                </div>
              </div>
              <div className="flex flex-col my-1">
                <label className="font-semibold" htmlFor="date">
                  Select Date:
                </label>
                <input
                  type="date"
                  min={currentDate !== "" ? currentDate : ""}
                  //   min={"2024-01-23"}
                  id="date"
                  className="w-max border rounded"
                  onChange={(e) => {
                    setBookingData({ ...bookingData, date: e.target.value });
                  }}
                />
              </div>
              {/* price */}
              <div className="flex flex-col gap-2">
                <p className="font-semibold">Price:</p>
                <div className="flex items-center gap-2">
                  {packageData.packageDiscountPrice ? (
                    <>
                      <span className="line-through text-gray-400">
                        ₹{packageData.packagePrice}
                      </span>
                      -<span className="font-semibold text-green-600">₹{packageData.packageDiscountPrice}</span>
                      <span className="text-sm text-green-600">
                        (
                        {Math.round(
                          ((+packageData.packagePrice -
                            +packageData.packageDiscountPrice) /
                            +packageData.packagePrice) *
                            100
                        )}
                        % OFF)
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold">₹{packageData.packagePrice}</span>
                  )}
                </div>
              </div>
              {/* price */}
              <div className="flex border-2 w-max">
                <button
                  className="p-2 py-1 font-semibold"
                  onClick={() => {
                    if (bookingData.persons > 1) {
                      setBookingData({
                        ...bookingData,
                        persons: (bookingData.persons -= 1),
                        totalPrice: packageData.packageDiscountPrice
                          ? packageData.packageDiscountPrice *
                            bookingData.persons
                          : packageData.packagePrice * bookingData.persons,
                      });
                    }
                  }}
                >
                  -
                </button>
                <input
                  value={bookingData.persons}
                  disabled
                  type="text"
                  className="border w-10 text-center text-lg"
                />
                <button
                  className="p-2 py-1 font-semibold"
                  onClick={() => {
                    if (bookingData.persons < 10) {
                      setBookingData({
                        ...bookingData,
                        persons: (bookingData.persons += 1),
                        totalPrice: packageData.packageDiscountPrice
                          ? packageData.packageDiscountPrice *
                            bookingData.persons
                          : packageData.packagePrice * bookingData.persons,
                      });
                    }
                  }}
                >
                  +
                </button>
              </div>
              {/* Total Price */}
              <div className="flex flex-col gap-2">
                <p className="font-semibold">Total Price:</p>
                <p className="text-xl font-bold text-green-600">
                  ₹
                  {packageData.packageDiscountPrice
                    ? packageData.packageDiscountPrice * bookingData.persons
                    : packageData.packagePrice * bookingData.persons}
                </p>
              </div>
              {/* <div className="my-2 max-w-[300px] gap-1">
                <p
                  className={`font-semibold ${
                    instance && "text-red-700 text-sm"
                  }`}
                >
                  Payment:
                  {!instance
                    ? "Loading..."
                    : "Don't use your original card details!(This is not the production build)"}
                </p>
                {clientToken && (
                  <>
                    <DropIn
                      options={{
                        authorization: clientToken,
                        paypal: {
                          flow: "vault",
                        },
                      }}
                      onInstance={(instance) => setInstance(instance)}
                    />
                    <button
                      className="p-2 rounded bg-blue-600 text-white payment-btn disabled:optional:80 hover:opacity-95 cursor-pointer"
                      onClick={handleBookPackage}
                      disabled={loading || !instance || !currentUser?.address}
                    >
                      {loading ? "Processing..." : "Book Now"}
                    </button>
                  </>
                )}
              </div> */}
              <button
              className="p-2 rounded bg-blue-600 text-white hover:opacity-95 cursor-pointer"
              onClick={handleBookPackage}
              disabled={loading}
            >
              {loading ? "Processing..." : "Book Now"}
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
