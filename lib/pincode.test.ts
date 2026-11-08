import { describe, expect, it } from "vitest";
import { isPincode, matchCity, matchState, parsePincodeResponse } from "./pincode";

const reply = (offices: object[]) => [{ Message: "found", Status: "Success", PostOffice: offices }];

describe("pincode", () => {
  it("knows a valid pincode", () => {
    expect(isPincode("411001")).toBe(true);
    expect(isPincode("011001")).toBe(false);
    expect(isPincode("41100")).toBe(false);
  });

  it("reads India Post's answer into our state and city", () => {
    expect(parsePincodeResponse(reply([{ Name: "Shivajinagar", District: "Pune", State: "Maharashtra", Block: "Pune City" }]))).toEqual({
      state: "Maharashtra", city: "Pune", district: "Pune",
    });
  });

  it("maps old or different names", () => {
    expect(matchState("Jammu & Kashmir")).toBe("Jammu and Kashmir");
    expect(matchState("Daman & Diu")).toBe("Dadra and Nagar Haveli and Daman and Diu");
    expect(matchState("DELHI")).toBe("Delhi");
    expect(matchCity("Karnataka", ["Bangalore"])).toBe("Bengaluru");
    expect(matchCity("Haryana", ["Gurgaon"])).toBe("Gurugram");
  });

  it("gives the district when it isn't one of our listed cities", () => {
    expect(parsePincodeResponse(reply([{ Name: "Somewhere", District: "Tiny District", State: "Maharashtra" }]))).toEqual({
      state: "Maharashtra", city: null, district: "Tiny District",
    });
  });

  it("returns null for unknown pincodes or odd answers", () => {
    expect(parsePincodeResponse([{ Message: "No records found", Status: "Error", PostOffice: null }])).toBeNull();
    expect(parsePincodeResponse(null)).toBeNull();
    expect(parsePincodeResponse(reply([{ District: "X", State: "Atlantis" }]))).toBeNull();
  });
});
