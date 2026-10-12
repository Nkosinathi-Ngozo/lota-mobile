import * as Linking from "expo-linking";
import { Platform } from "react-native";

import type { AssetRecord, LocationProfile } from "@/types/domain";

const locationTypes = new Set(["Mission", "Office", "Facility", "Building", "Floor", "Organisation", "Region", "Country", "Room"]);

export function isLocationRecord(asset: AssetRecord) {
  return asset.assetType === "Property" && (asset.category === "Location" || locationTypes.has(asset.assetClass));
}

export function getLocations(assets: AssetRecord[]) {
  return assets.filter(isLocationRecord);
}

export function getLocationPath(locations: AssetRecord[], locationId: string | undefined) {
  if (!locationId) return "";
  const byId = new Map(locations.map((location) => [location.uid, location]));
  const path: AssetRecord[] = [];
  const seen = new Set<string>();
  let current = byId.get(locationId);

  while (current && !seen.has(current.uid)) {
    path.unshift(current);
    seen.add(current.uid);
    current = current.parentUid ? byId.get(current.parentUid) : undefined;
  }

  return path.map((location) => location.name).join(" / ");
}

export function getNearestLocation(asset: AssetRecord, assetList: AssetRecord[]) {
  const locations = getLocations(assetList);
  const locationIds = new Set(locations.map((location) => location.uid));
  if (asset.locationId) return locations.find((location) => location.uid === asset.locationId);

  let current: AssetRecord | undefined = asset;
  const seen = new Set<string>();
  while (current && !seen.has(current.uid)) {
    if (locationIds.has(current.uid)) return current;
    seen.add(current.uid);
    current = current.parentUid ? assetList.find((candidate) => candidate.uid === current?.parentUid) : undefined;
  }

  return undefined;
}

export function formatLocationAddress(profile: Partial<LocationProfile> | undefined) {
  if (!profile) return "";
  return [profile.addressLine1, profile.addressLine2, profile.city, profile.stateRegion, profile.country, profile.postalCode]
    .filter(Boolean)
    .join(", ");
}

export function locationDisplayAddress(location: AssetRecord | undefined) {
  if (!location) return "";
  return location.location?.geocodedDisplayName || formatLocationAddress(location.location) || location.property?.address || "";
}

export function assetFallbackLocation(asset: AssetRecord) {
  return [asset.building, asset.room].filter(Boolean).join(" - ") || asset.region;
}

export function locationCoordinates(location: AssetRecord | Partial<LocationProfile> | undefined) {
  const profile = location && "uid" in location ? location.location : location;
  const latitude = Number(profile?.gpsLatitude);
  const longitude = Number(profile?.gpsLongitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

export function canNavigateToLocation(location: AssetRecord | undefined) {
  return Boolean(locationCoordinates(location) || locationDisplayAddress(location));
}

export async function openNavigationToLocation(location: AssetRecord, label?: string) {
  const coords = locationCoordinates(location);
  const address = locationDisplayAddress(location);
  const destination = coords ? `${coords.latitude},${coords.longitude}` : address;
  if (!destination) throw new Error("This location does not have a navigable address yet.");

  const name = encodeURIComponent(label || location.name || address);
  const encodedDestination = encodeURIComponent(destination);
  const candidates =
    Platform.OS === "ios"
      ? [
          `maps://?daddr=${encodedDestination}&q=${name}`,
          `https://maps.apple.com/?daddr=${encodedDestination}&q=${name}`,
        ]
      : [
          coords ? `google.navigation:q=${encodedDestination}` : "",
          `geo:0,0?q=${encodedDestination}(${name})`,
        ].filter(Boolean);

  candidates.push(`https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=driving`);

  for (const url of candidates) {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      return;
    }
  }

  await Linking.openURL(candidates[candidates.length - 1]);
}
