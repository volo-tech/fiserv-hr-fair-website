import { useState, useEffect } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";

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
  const [resendTimer, setResendTimer] = useState(0);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" | "error"
  const [loading, setLoading] = useState(false);
  const [formSubmission, setFormSubmission] = useState(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendTimer]);

  const sendOtp = async () => {
    if (!email) {
      setMessage("Please enter a valid email before requesting OTP.");
      setMessageType("error");
      return;
    }
    if (!email.toLowerCase().includes("@fiserv.com")) {
      setMessage("Please enter your official email id.");
      setMessageType("error");
      return false;
    }

    const res = await fetch(
      "https://webapp.canswer.dcodecare.com/rest/pes/send-fiserv-otp",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
      setMessage("Failed to send OTP. Try again.");
      setMessageType("error");
    }
  };

  const verifyOtp = async () => {
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
    if (!name || !email || !location || !date || !time || !isVerified) {
      setMessage("Please fill all fields and verify your email.");
      setMessageType("error");
      return false;
    }
    if (!email.toLowerCase().includes("@fiserv.com")) {
      setMessage("Please enter your official email id.");
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
          subject: "Your booking is confirmed",
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
      city: location,
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
      if (data.success) {
        await sendBookingConfirmation();
      }
    } catch (error) {
      setMessage("An error occurred while submitting.");
      setMessageType("Error: ", error.message);
    } finally {
      setLoading(false); // End loading
    }
  };

  const locationData = [
    "Noida",
    "Gurugram",
    "Bengaluru",
    "Thane",
    "Pune",
    "Chennai",
  ];

  const locationTimeSlots = {
    Gurugram: [
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

  return (
    <div className="relative min-h-screen flex flex-col items-center p-6 pt-30 text-black">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: "url('/images/bg-02.jpg')" }}
      />{" "}
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-voloPink to-black opacity-70 z-10" />
      <header className="w-full h-30 px-10 flex justify-between items-center shadow-md bg-white fixed top-0 left-0 z-10">
        <img
          src="/logos/volo_logo_transparent.png"
          alt="Logo 2"
          className="h-24"
        />
        <img src="/logos/Fiserv-Logo.png" alt="Logo 1" className="h-24" />
      </header>
      <div className="relative z-20 w-full">
        <div className="flex flex-1 w-full max-w-screen-2xl mt-6 gap-6">
          {/* Left Info Card */}
          <div className="w-1/2 flex flex-col gap-5">
            <Card className="w-full text-black rounded-2xl shadow-xl bg-gradient-to-r from-finnovaOrange/50 to-vfinnovaRed/50">
              <div className="flex gap-5 items-center">
                <Card className="w-full bg-white/90 text-black rounded-2xl shadow-xl">
                  <CardContent className="p-6 space-y-6">
                    <div className="mt-4 text-sm text-gray-600">
                      <h1 className="text-3xl font-bold mb-2 text-voloDark">
                        Event Details
                      </h1>
                      <p className="text-xl text-voloSmokyblacklight">
                        <strong>Event Date:</strong> June 11th & 12th, 2025
                      </p>
                      <p className="text-xl text-voloSmokyblacklight">
                        <strong>Timings:</strong> 10:00 AM – 5:00 PM
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <CardContent className="p-6 space-y-6"></CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-finnovaOrange/50 to-vfinnovaRed/50">
              <Card className="w-full bg-white/90 text-black rounded-2xl shadow-xl">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h1 className="text-3xl text-voloDark font-bold">
                      Welcome!
                    </h1>
                    <p className="mt-2 text-gray-700 text">
                      Request you to please enter the details for all the fields
                      for Health checkup package comprising of:
                    </p>
                    <ul className="list-disc pl-6 mt-2 text-gray-700 space-y-1">
                      <li>Eye checkup</li>
                      <li>Dental checkup</li>
                      <li>BMI check</li>
                      <li>Blood Sugar (Glucometer) & Blood Pressure</li>
                      <li>Bone Densitometry (recommended for 40+)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </Card>
          </div>
          <div className="w-1/2">
            <Card className="w-full h-full  bg-white/90 text-black rounded-2xl shadow-xl">
              {formSubmission ? (
                <div className="h-full flex items-center justify-center">
                  <div>
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
                  <form onSubmit={handleSubmit} className="mt-10 space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          readOnly={isVerified}
                        />
                        {!isVerified ? (
                          <Button
                            type="button"
                            onClick={sendOtp}
                            disabled={resendTimer > 0}
                            className="whitespace-nowrap"
                          >
                            {resendTimer > 0
                              ? `Resend in ${resendTimer}s`
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
                          />
                          <Button type="button" onClick={verifyOtp}>
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
                      >
                        <option value="">-- Select Location --</option>
                        {locationData.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
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
                        >
                          <option value="">-- Select Date --</option>
                          <option value="11th June, 2025">
                            11th June, 2025
                          </option>
                          <option value="12th June, 2025">
                            12th June, 2025
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
                      disabled={loading}
                    >
                      {loading ? "Submitting..." : "Submit"}
                    </Button>
                  </form>
                  <Card className="w-full bg-white/90 text-black rounded-2xl shadow-xl mt-5">
                    <CardContent className="p-6 space-y-6">
                      <div className=" text-sm text-gray-600">
                        {/* <h1 className="text-xl font-bold mb-2">Note:</h1> */}
                        <ul className="list-disc pl-6 text-gray-700 space-y-1">
                          <li className="text-sm italic">
                            The initiative is part of the “HR Fair”, associate
                            may choose to go for one or all the tests/check-ups
                            listed above as per the selected date & time
                            mentioned in the below form.
                          </li>
                          <li className="text-sm italic">
                            “Bone Densitometry checkup” advisable for associates
                            in age group 40 years & above.
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
  );
}
