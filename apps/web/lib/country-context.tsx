"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type { ReactNode } from "react";

import {
  COUNTRIES,
  getCountryConfig,
} from "./countries";

import type { CountryConfig } from "./countries";

type CountryContextType = {
  countryCode: string;
  country: CountryConfig;
  setCountryCode: (countryCode: string) => void;
  countries: CountryConfig[];
};

const DEFAULT_COUNTRY_CODE = "IN";

const CountryContext =
  createContext<CountryContextType | undefined>(
    undefined
  );

function resolveCountry(
  countryCode: string
): CountryConfig {
  const country = getCountryConfig(countryCode);

  if (country) {
    return country;
  }

  const fallback = getCountryConfig(
    DEFAULT_COUNTRY_CODE
  );

  if (fallback) {
    return fallback;
  }

  throw new Error(
    'Country configuration is missing for "IN". ' +
      "Check your countries.ts configuration."
  );
}

export function CountryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [countryCode, setCountryCodeState] =
    useState<string>(DEFAULT_COUNTRY_CODE);

  const country = useMemo(
    () => resolveCountry(countryCode),
    [countryCode]
  );

  const countries = useMemo(
    () => Object.values(COUNTRIES),
    []
  );

  const setCountryCode = useCallback(
    (newCountryCode: string) => {
      const normalizedCode =
        newCountryCode.trim().toUpperCase();

      if (
        !Object.prototype.hasOwnProperty.call(
          COUNTRIES,
          normalizedCode
        )
      ) {
        console.warn(
          `Unsupported country code: ${newCountryCode}`
        );
        return;
      }

      setCountryCodeState(normalizedCode);
    },
    []
  );

  const contextValue = useMemo<CountryContextType>(
    () => ({
      countryCode,
      country,
      setCountryCode,
      countries,
    }),
    [
      countryCode,
      country,
      setCountryCode,
      countries,
    ]
  );

  return (
    <CountryContext.Provider value={contextValue}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry(): CountryContextType {
  const context = useContext(CountryContext);

  if (context === undefined) {
    throw new Error(
      "useCountry must be used inside CountryProvider. " +
        "Wrap the component tree in CountryProvider."
    );
  }

  return context;
}
