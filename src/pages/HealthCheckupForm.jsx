import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const REGISTRATION_END_DATE = "2026-05-15";
const SLOT_AVAILABILITY_API_URL =
  "https://webapp.canswer.dcodecare.com/rest/pes/check-slot-availablity";

const getIndiaDateString = () => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
};

const getBackendCityValue = (city) =>
  city === "Bangalore" ? "Bengaluru" : city;

const getRemainingSlotsFromMessage = (slotMessage) => {
  const match = slotMessage.match(/(\d+)\s+slot/i);
  return match ? Number(match[1]) : null;
};

export default function HealthCheckupForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [jwtToken, setJwtToken] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [showConsentDetails, setShowConsentDetails] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" | "error"
  const [loading, setLoading] = useState(false);
  const [formSubmission, setFormSubmission] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [slotAvailabilityMessage, setSlotAvailabilityMessage] = useState("");
  const [slotAvailabilityType, setSlotAvailabilityType] = useState("");
  const [isCheckingSlot, setIsCheckingSlot] = useState(false);
  const [isSlotAvailable, setIsSlotAvailable] = useState(true);
  const currentIndiaDate = getIndiaDateString();
  const isRegistrationOpen = currentIndiaDate <= REGISTRATION_END_DATE;
  const registrationStatusMessage =
    currentIndiaDate > REGISTRATION_END_DATE
      ? "Registration closed on May 15th, 2026."
      : "";

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendTimer]);

  useEffect(() => {
    if (!location || !date || !time) {
      setSlotAvailabilityMessage("");
      setSlotAvailabilityType("");
      setIsSlotAvailable(true);
      setIsCheckingSlot(false);
      return;
    }

    let isCancelled = false;

    const checkSlotAvailability = async () => {
      setIsCheckingSlot(true);
      setSlotAvailabilityMessage("Checking slot availability...");
      setSlotAvailabilityType("");

      try {
        const params = new URLSearchParams({
          slot: time,
          date,
          city: getBackendCityValue(location).toLowerCase(),
        });
        const response = await fetch(
          `${SLOT_AVAILABILITY_API_URL}?${params.toString()}`
        );
        const data = await response.json();

        if (isCancelled) return;

        const availabilityMessage =
          data.message ||
          (data.success === false ? "No slots available." : "Slots available.");
        const slotOpen =
          response.ok &&
          data.success !== false &&
          !/slots?\s*full/i.test(availabilityMessage);

        setIsSlotAvailable(slotOpen);
        setSlotAvailabilityMessage(availabilityMessage);
        setSlotAvailabilityType(slotOpen ? "success" : "error");
      } catch (error) {
        if (isCancelled) return;

        setIsSlotAvailable(true);
        setSlotAvailabilityMessage(
          "Could not check slot availability right now."
        );
        setSlotAvailabilityType("error");
      } finally {
        if (!isCancelled) {
          setIsCheckingSlot(false);
        }
      }
    };

    checkSlotAvailability();

    return () => {
      isCancelled = true;
    };
  }, [date, location, time]);

  const sendOtp = async () => {
    if (!isRegistrationOpen) {
      setMessage(registrationStatusMessage);
      setMessageType("error");
      return;
    }

    setLoadingOtp(true);
    console.log(
      !email.toLowerCase().includes("@fiserv.com") &&
        !email.toLowerCase().includes("@volohealth.in")
    );
    if (!email) {
      setMessage("Please enter a valid email before requesting OTP.");
      setMessageType("error");
      setLoadingOtp(false);
      return;
    }
    if (
      !email.toLowerCase().includes("@fiserv.com") &&
      !email.toLowerCase().includes("@volohealth.in")
    ) {
      setMessage("Please enter your official email id.");
      setMessageType("error");
      setLoadingOtp(false);
      return false;
    }

    const res = await fetch(
      "https://webapp.canswer.dcodecare.com/rest/pes/send-fiserv-otp",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({email: email }),
      }
    );

    const data = await res.json();
    if (data?.token) {
      setJwtToken(data.token);
      setOtpSent(true);
      setResendTimer(30);
      setMessage("OTP sent to your email.");
      setMessageType("success");
      
    } else {
      setMessage(data.message || "Failed to send OTP. Try again.");
      setMessageType("error");
    }
    setLoadingOtp(false);
  };

  const verifyOtp = async () => {
    if (!isRegistrationOpen) {
      setMessage(registrationStatusMessage);
      setMessageType("error");
      return;
    }

    const res = await fetch(
      "https://webapp.canswer.dcodecare.com/rest/pes/verify-fiserv-otp",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: jwtToken, enteredOtp: otp }),
      }
    );
    const data = await res.json();
    if (data?.verified) {
      setIsVerified(true);
      setMessage("Email verified successfully!");
      setMessageType("success");
    } else {
      setIsVerified(false);
      setMessage("OTP verification failed.");
      setMessageType("error");
    }
  };

  const isFormValid = () => {
    if (!isRegistrationOpen) {
      setMessage(registrationStatusMessage);
      setMessageType("error");
      return false;
    }

    if (!name || !email || !location || !date || !time || !isVerified) {
      setMessage(
        "Please fill all fields and verify your email by clicking on Send OTP"
      );
      setMessageType("error");
      return false;
    }
    if (
      !email.toLowerCase().includes("@fiserv.com") &&
      !email.toLowerCase().includes("@volohealth.in")
    ) {
      setMessage("Please enter your official email id.");
      setMessageType("error");
      return false;
    }
    if (isCheckingSlot) {
      setMessage("Checking slot availability. Please wait.");
      setMessageType("error");
      return false;
    }
    if (!isSlotAvailable) {
      setMessage(slotAvailabilityMessage || "No slots available.");
      setMessageType("error");
      return false;
    }
    if (!hasConsent) {
      setMessage("Please provide your consent before submitting.");
      setMessageType("error");
      return false;
    }
    return true;
  };

  const sendBookingConfirmation = async () => {
    // const htmlContent = await fetchHtmlContent();
    await fetch(
      "https://webapp.canswer.dcodecare.com/rest/pes/sendEmailfromS3",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s3Key: "fiserv-email-template/bookingConfirm.html",
          email: email.toLowerCase(),
          subject: "HR Expo : Health check-ups - Your booking is confirmed",
          name: name,
          testsIncluded:
            "Eye checkup, Dental checkup, BMI check, Blood Sugar (Glucometer) & Blood Pressure, Bone Densitometry (recommended for 40+)",
          centerName: location,
          appointmentSlotDate: `${time}, ${date}`,
        }),
      }
    ).then((response) => {
      return response;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid()) return;

    setLoading(true); // Start loading

    const formData = {
      name,
      Email: email,
      city: getBackendCityValue(location),
      date,
      slot: time,
      key: "Fiserv.csv",
    };

    try {
      const response = await fetch(
        "https://webapp.canswer.dcodecare.com/rest/pes/update-csv",
        // "http://localhost:3000/rest/pes/update-csv",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json(); // <-- Fix here
      setMessage(data.message || "Submission complete.");
      setMessageType(data.success ? "success" : "error");
      setFormSubmission(data.success);
      if (!data.success) {
        setIsSlotAvailable(!/slots?\s*full/i.test(data.message || ""));
        setSlotAvailabilityMessage(data.message || "");
        setSlotAvailabilityType(data.success ? "success" : "error");
      }
      if (data.success) {
        await sendBookingConfirmation();
      }
    } catch (error) {
      setMessage("An error occurred while submitting.");
      setMessageType("Error: ", error.message);
    } finally {
      setLoading(false); // End loading
      setLoadingOtp(false)
    }
  };

  const locationData = [
    "Noida",
    "Gurugram",
    "Bangalore",
    "Thane",
    "Pune",
    "Chennai",
  ];

  const slotsPerHourByLocation = {
    Noida: 120,
    Gurugram: 60,
    Pune: 180,
    Thane: 60,
    Chennai: 60,
    Bangalore: 60,
  };

  const locationTimeSlots = {
    Gurugram: [
      "10am-11am",
      "11am-12pm",
      "12pm-1pm",
      "1pm-2pm",
      "2pm-3pm",
      "3pm-4pm",
      "4pm-5pm",
    ],
    // Other cities follow 10AM - 5PM
    default: [
      "10am-11am",
      "11am-12pm",
      "12pm-1pm",
      "1pm-2pm",
      "2pm-3pm",
      "3pm-4pm",
      "4pm-5pm",
    ],
  };

  const timeSlots =
    location === "Gurugram"
      ? locationTimeSlots["Gurugram"]
      : location
      ? locationTimeSlots["default"]
      : [];

  const selectedLocationSlotsPerHour = location
    ? slotsPerHourByLocation[location]
    : null;
  const remainingSlots = getRemainingSlotsFromMessage(slotAvailabilityMessage);

  return (
    <>
      <header className="w-full h-30 px-5 md:px-10 flex justify-between items-center shadow-md bg-white top-0 left-0 z-20">
        <img
          src="/logos/volo_logo_transparent.png"
          alt="Logo 2"
          className="h-16 md:h-24"
        />
        <img
          src="/logos/Fiserv-Logo.png"
          alt="Logo 1"
          className="h-16 md:h-24"
        />
      </header>
      <div className="relative min-h-screen flex flex-col items-center p-6 text-black">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: "url('/images/bg-02.jpg')" }}
        />{" "}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-voloPink to-black opacity-70 z-10" />
        <div className="relative z-20 w-full">
          <div className="flex flex-col md:flex-row w-full max-w-screen-2xl mt-6 gap-6 mx-auto">
            {/* Left Info Card */}
            <div className="md:w-1/2 flex flex-col-reverse gap-5 justify-end items-center">
              <Card className="w-full text-black rounded-2xl shadow-xl bg-gradient-to-r from-finnovaOrange/50 to-vfinnovaRed/50">
                <div className="flex gap-5 items-center">
                  <Card className="w-full bg-white/90 text-black rounded-2xl shadow-xl">
                    <CardContent className="p-6 space-y-6">
                      <div className="mt-4 text-sm text-gray-600">
                        <h1 className="text-3xl font-bold mb-2 text-voloDark">
                          Event Details
                        </h1>
                        <p className="text-xl text-voloSmokyblacklight">
                          <strong>Event Date:</strong> May 20th & 21st, 2026
                        </p>
                        <p className="text-xl text-voloSmokyblacklight">
                          <strong>Timings:</strong> 10:00 AM – 5:00 PM
                        </p>
                        <p className="text-xl text-voloSmokyblacklight">
                          <strong>Registration Dates:</strong> May 11th to 15th, 2026
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </Card>
              <Card className="bg-gradient-to-r from-finnovaOrange/50 to-vfinnovaRed/50">
                <Card className="w-full bg-white/90 text-black rounded-2xl shadow-xl">
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <h1 className="text-3xl text-voloDark font-bold">
                        Welcome to HR EXPO 2026
                      </h1>
                      <p className="mt-2 text-gray-700 text">
                        Request you to please enter the details for all the
                        fields for Health checkup package comprising of:
                      </p>
                      <ul className="list-disc pl-6 mt-2 text-gray-700 space-y-1">
                        <li>Eye checkup</li>
                        <li>Dental checkup</li>
                        <li>BMI check</li>
                        <li>Blood Sugar (Glucometer) & Blood Pressure</li>
                        <li>Bone Densitometry (recommended for 40+)</li>
                      </ul>
                      <Button
                        className="block md:hidden w-full mt-4"
                        disabled={loading}
                        onClick={() => {
                          const el = document.getElementById("form-section");
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth" });
                          }
                        }}
                      >
                        Register Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Card>
            </div>
            <div id="form-section" className="md:w-1/2">
              <Card className="w-full h-full  bg-white/90 text-black rounded-2xl shadow-xl">
                {formSubmission ? (
                  <div className="h-full flex items-center justify-center">
                    <div>
                      <h1 className="text-3xl font-bold mb-2 text-voloDark">
                        HR Expo : Health check-ups
                      </h1>
                      <h2 className="text-center">Thank you!</h2>
                      <h2 className="text-center">
                        Your form has been submitted.
                      </h2>
                    </div>
                  </div>
                ) : (
                  <CardContent className="p-6 space-y-6">
                    <h1 className="text-3xl font-bold mb-2 text-voloDark">
                      Registration Details
                    </h1>
                    {!isRegistrationOpen && (
                      <div className="rounded bg-amber-100 p-3 text-sm font-medium text-amber-900">
                        {registrationStatusMessage}
                      </div>
                    )}
                    <form onSubmit={handleSubmit} className="mt-10 space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          placeholder="Enter your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          disabled={!isRegistrationOpen}
                        />
                      </div>

                      <div>
                        <Label htmlFor="email">Email</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            id="email"
                            type="email"
                            placeholder="email@fiserv.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            readOnly={isVerified}
                            disabled={!isRegistrationOpen}
                          />
                          {!isVerified ? (
                            <Button
                              type="button"
                              onClick={sendOtp}
                              disabled={
                                !isRegistrationOpen ||
                                resendTimer > 0 ||
                                loadingOtp
                              }
                              className="whitespace-nowrap"
                            >
                              {resendTimer > 0
                                ? `Resend in ${resendTimer}s`
                                : loadingOtp
                                ? "Sending OTP"
                                : "Send OTP"}
                            </Button>
                          ) : (
                            <span className="text-green-600 font-semibold text-sm">
                              Verified
                            </span>
                          )}
                        </div>
                      </div>

                      {otpSent && !isVerified && (
                        <div>
                          <Label htmlFor="otp">OTP</Label>
                          <div className="flex gap-2">
                            <Input
                              id="otp"
                              placeholder="Enter OTP"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              disabled={!isRegistrationOpen}
                            />
                            <Button
                              type="button"
                              onClick={verifyOtp}
                              disabled={!isRegistrationOpen}
                            >
                              Verify
                            </Button>
                          </div>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="location">Location</Label>
                        <select
                          id="location"
                          value={location}
                          onChange={(e) => {
                            setLocation(e.target.value);
                            setTime(""); // Reset selected time if location changes
                          }}
                          className="w-full p-2 rounded border border-gray-300"
                          required
                          disabled={!isRegistrationOpen}
                        >
                          <option value="">-- Select Location --</option>
                          {locationData
                            .slice()
                            .sort((a, b) => a.localeCompare(b))
                            .map((loc) => (
                              <option key={loc} value={loc}>
                                {loc}
                              </option>
                            ))}
                        </select>
                        {selectedLocationSlotsPerHour && (
                          <p className="mt-2 text-sm text-gray-600">
                            Max capacity per hour: {selectedLocationSlotsPerHour}
                          </p>
                        )}
                        {remainingSlots !== null && (
                          <p className="mt-1 text-sm font-medium text-voloDark">
                            Remaining slots for selected hour: {remainingSlots}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                          <Label htmlFor="date">Preferred Date</Label>
                          <select
                            id="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-2 rounded border border-gray-300"
                            required
                            disabled={!isRegistrationOpen}
                          >
                            <option value="">-- Select Date --</option>
                            <option value="20th May, 2026">
                              20th May, 2026
                            </option>
                            <option value="21st May, 2026">
                              21st May, 2026
                            </option>
                          </select>
                        </div>

                        <div className="flex-1">
                          <Label htmlFor="time">Time Slot</Label>
                          <select
                            id="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full p-2 rounded border border-gray-300"
                            required
                            disabled={!isRegistrationOpen}
                          >
                            <option value="">-- Select Time Slot --</option>
                            {timeSlots.map((slot) => (
                              <option key={slot} value={slot}>
                                {slot}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {slotAvailabilityMessage && (
                        <div
                          className={`p-3 rounded text-sm font-medium ${
                            slotAvailabilityType === "success"
                              ? "bg-green-100 text-green-800"
                              : slotAvailabilityType === "error"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {slotAvailabilityMessage}
                        </div>
                      )}
                      <div className="rounded-xl border border-gray-200 bg-white/95 p-4 shadow-sm">
                        <label
                          htmlFor="consent"
                          className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm leading-6 text-gray-700 transition-colors hover:border-gray-300"
                        >
                          <input
                            id="consent"
                            type="checkbox"
                            checked={hasConsent}
                            onChange={(e) => setHasConsent(e.target.checked)}
                            disabled={!isRegistrationOpen}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-voloDark focus:ring-2 focus:ring-voloPink/40"
                          />
                          <div className="min-w-0">
                            <p className="line-clamp-2 font-medium text-gray-800">
                              I am voluntarily participating in this Health
                              Checkup Camp as a part of HR Expo 2026 and give
                              my consent for the use of the information shared
                              by me for registration and Health Checkup
                              purposes.
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setShowConsentDetails((prev) => !prev)
                              }
                              className="mt-1 text-sm font-semibold text-voloDark underline underline-offset-2"
                            >
                              {showConsentDetails ? "Read less" : "Read more"}
                            </button>
                            {showConsentDetails && (
                              <p className="mt-2 text-sm leading-6 text-gray-600">
                                I am voluntarily participating in this Health
                                Checkup Camp as a part of HR Expo 2026 and am
                                providing personal including medical
                                information on my free will and accord. I
                                understand that the information provided by me
                                will be only for registration and Health
                                Checkup purposes and will be shared on a strict
                                need to know basis. The shared information will
                                be kept confidential and will not be shared
                                with third parties unless required for the
                                services rendered in the Health Checkup Camp as
                                a part of HR Expo 2026. By submitting my
                                information, I give my consent for the use of
                                the information shared by me.
                              </p>
                            )}
                          </div>
                        </label>
                      </div>
                      {message && (
                        <div
                          className={`p-3 rounded text-sm font-medium ${
                            messageType === "success"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {message}
                        </div>
                      )}
                      <Button
                        type="submit"
                        className="w-full mt-4"
                        disabled={
                          loading ||
                          !isRegistrationOpen ||
                          isCheckingSlot ||
                          !isSlotAvailable ||
                          !hasConsent
                        }
                      >
                        {loading
                          ? "Submitting..."
                          : isCheckingSlot
                          ? "Checking availability..."
                          : "Submit"}
                      </Button>
                    </form>
                    <Card className="w-full bg-white/90 text-black rounded-2xl shadow-xl mt-5">
                      <CardContent className="p-6 space-y-6">
                        <div className=" text-sm text-gray-600">
                          {/* <h1 className="text-xl font-bold mb-2">Note:</h1> */}
                          <ul className="list-disc pl-6 text-gray-700 space-y-1">
                            <li className="text-sm italic">
                              <strong>
                                The initiative is part of the “HR Expo 2026”,
                                associate may choose to go for one or all the
                                tests/check-ups listed above as per the
                                selected date & time mentioned in the form.
                              </strong>
                            </li>
                            <li className="text-sm italic">
                              Bone Densitometry is only for associates aged 40
                              years and above.
                            </li>
                            <li className="text-sm italic">
                              This is on a first come first serve basis, so
                              block your seats accordingly and please adhere to
                              your slot as reschedule would not be possible.
                            </li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </CardContent>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
