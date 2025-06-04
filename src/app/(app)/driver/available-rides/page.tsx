
"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, User, Clock, Check, X, Navigation, Route, CheckCircle, XCircle, MessageSquare, Users as UsersIcon, Info, Phone, Star, BellRing, CheckCheck, Loader2, Building, Car as CarIcon, Power, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { RideOfferModal, type RideOffer } from '@/components/driver/ride-offer-modal';
import { cn } from '@/lib/utils';
import { Progress } from "@/components/ui/progress"; // Import Progress component

const GoogleMapDisplay = dynamic(() => import('@/components/ui/google-map-display'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full rounded-md" />,
});

interface RideRequest {
  id: string;
  passengerName: string;
  passengerAvatar: string;
  pickupLocation: string;
  dropoffLocation: string;
  estimatedTime: string;
  fareEstimate: number;
  status: 'pending' | 'accepted' | 'declined' | 'active' | 'driver_assigned' | 'arrived_at_pickup' | 'in_progress' | 'completed' | 'cancelled_by_driver';
  pickupCoords?: { lat: number; lng: number };
  dropoffCoords?: { lat: number; lng: number };
  distanceMiles?: number;
  passengerCount: number;
  passengerPhone?: string;
  passengerRating?: number;
  notifiedPassengerArrivalTimestamp?: string | null;
  passengerAcknowledgedArrivalTimestamp?: string | null;
}

const huddersfieldCenterGoogle: google.maps.LatLngLiteral = { lat: 53.6450, lng: -1.7830 };

const mockRideRequests: RideRequest[] = [
  { id: 'r1', passengerName: 'Alice Smith', passengerAvatar: 'https://placehold.co/40x40.png?text=AS', pickupLocation: '6 Colne Street Paddock Huddersfield HD1 4RX', dropoffLocation: '12 Lindley Moor Road Lindley Huddersfield HD3 3RT', estimatedTime: '10 min', fareEstimate: 7.50, status: 'pending', pickupCoords: { lat: 53.6410, lng: -1.7950 }, dropoffCoords: { lat: 53.6600, lng: -1.8200 }, distanceMiles: 2.5, passengerCount: 1, passengerPhone: '555-0101', passengerRating: 4.5 },
  { id: 'r2', passengerName: 'Bob Johnson', passengerAvatar: 'https://placehold.co/40x40.png?text=BJ', pickupLocation: 'Huddersfield Station', dropoffLocation: 'University of Huddersfield, Queensgate', estimatedTime: '5 min', fareEstimate: 5.00, status: 'pending', pickupCoords: { lat: 53.6490, lng: -1.7795 }, dropoffCoords: { lat: 53.6430, lng: -1.7720 }, distanceMiles: 1.2, passengerCount: 2, passengerPhone: '555-0102', passengerRating: 4.8 },
];

const blueDotSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8" fill="#4285F4" stroke="#FFFFFF" stroke-width="2"/>
    <circle cx="12" cy="12" r="10" fill="#4285F4" fill-opacity="0.3"/>
  </svg>
`;
const blueDotSvgDataUrl = typeof window !== 'undefined' ? `data:image/svg+xml;base64,${window.btoa(blueDotSvg)}` : '';


export default function AvailableRidesPage() {
  const [rideRequests, setRideRequests] = useState<RideRequest[]>(mockRideRequests);
  const { toast } = useToast();
  const { user: driverUser } = useAuth();
  const [driverLocation, setDriverLocation] = useState<google.maps.LatLngLiteral>(huddersfieldCenterGoogle);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [currentOfferDetails, setCurrentOfferDetails] = useState<RideOffer | null>(null);
  const [isDriverOnline, setIsDriverOnline] = useState(true);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [progressValue, setProgressValue] = useState(0);


  useEffect(() => {
    if (isDriverOnline && navigator.geolocation) {
      setGeolocationError(null);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setDriverLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setGeolocationError(null);
        },
        (error) => {
          console.warn("Error watching position:", error);
          let message = "Could not get your location.";
          if (error.code === 1) message = "Location permission denied by user.";
          else if (error.code === 2) message = "Location information unavailable.";
          else if (error.code === 3) message = "Location request timed out.";
          setGeolocationError(message);
          toast({ title: "Location Error", description: message, variant: "destructive" });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (!navigator.geolocation && isDriverOnline) {
        setGeolocationError("Geolocation is not supported by this browser.");
        toast({ title: "Location Error", description: "Geolocation is not supported or enabled in your browser.", variant: "destructive" });
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isDriverOnline, toast]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    if (isDriverOnline && !geolocationError) {
      setProgressValue(0); // Reset progress when becoming active
      intervalId = setInterval(() => {
        setProgressValue((prev) => (prev >= 100 ? 0 : prev + 10)); // Cycle progress
      }, 300); // Adjust speed of "movement"
    } else {
      setProgressValue(0); // Reset if not online or error
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isDriverOnline, geolocationError]);


  const handleSimulateOffer = () => {
    const mockOffer: RideOffer = {
      id: 'mock-offer-123',
      pickupLocation: "6 Colne Street Paddock Huddersfield HD1 4RX",
      pickupCoords: { lat: 53.6410, lng: -1.7950 },
      dropoffLocation: "12 Lindley Moor Road Lindley Huddersfield HD3 3RT",
      dropoffCoords: { lat: 53.6600, lng: -1.8200 },
      fareEstimate: 12.50,
      passengerCount: 1,
      passengerName: "Sarah Connor",
      notes: "Going to the hospital. Please be quick."
    };
    setCurrentOfferDetails(mockOffer);
    setIsOfferModalOpen(true);
  };

  const handleAcceptOffer = (rideId: string) => {
    console.log("Offer accepted:", rideId);
    const acceptedRequest = rideRequests.find(r => r.id === rideId || rideId === 'mock-offer-123');
    if (acceptedRequest) {
        handleRideAction(acceptedRequest.id, 'accept');
    } else {
        toast({title: "Mock Ride Accepted", description: `Accepted offer for ride ID ${rideId}. Real assignment logic pending.`});
    }
    setIsOfferModalOpen(false);
    setCurrentOfferDetails(null);
  };

  const handleDeclineOffer = (rideId: string) => {
    console.log("Offer declined:", rideId);
     const declinedRequest = rideRequests.find(r => r.id === rideId || rideId === 'mock-offer-123');
    if (declinedRequest && declinedRequest.status !== 'pending') {
        handleRideAction(declinedRequest.id, 'decline');
    } else {
         toast({title: "Mock Ride Declined", description: `Declined offer for ride ID ${rideId}.`});
    }
    setIsOfferModalOpen(false);
    setCurrentOfferDetails(null);
  };


  const handleRideAction = async (rideId: string, actionType: 'accept' | 'decline' | 'notify_arrival' | 'start_ride' | 'complete_ride' | 'cancel_active') => {
    if (!driverUser) {
      toast({ title: "Error", description: "Driver not logged in.", variant: "destructive"});
      return;
    }
    setActionLoading(prev => ({ ...prev, [rideId]: true }));

    let newStatus: RideRequest['status'] | undefined = undefined;
    let apiAction: string | undefined = undefined;
    let toastMessage = "";
    let toastTitle = "";

    const currentRide = rideRequests.find(r => r.id === rideId);
    if (!currentRide && rideId !== 'mock-offer-123') {
        setActionLoading(prev => ({ ...prev, [rideId]: false }));
        toast({ title: "Error", description: `Ride with ID ${rideId} not found locally.`, variant: "destructive" });
        return;
    }

    let actualRideToUpdate = currentRide;
    if (rideId === 'mock-offer-123' && actionType === 'accept') {
        const firstPending = rideRequests.find(r => r.status === 'pending');
        if (firstPending) {
            actualRideToUpdate = firstPending;
            rideId = firstPending.id;
        } else {
            toast({ title: "No Pending Rides", description: "No pending rides available to accept for this mock offer.", variant: "default"});
            setActionLoading(prev => ({ ...prev, [rideId]: false }));
            return;
        }
    }

    const rideDisplayName = actualRideToUpdate?.passengerName || "the passenger";

    switch(actionType) {
        case 'accept':
            newStatus = 'driver_assigned';
            apiAction = undefined;
            toastTitle = "Ride Accepted";
            toastMessage = `Ride request from ${rideDisplayName} accepted.`;
            setRideRequests(prev => prev.map(r => {
                if (r.id === rideId) return { ...r, status: newStatus! };
                return r;
            }));
            break;
        case 'decline':
            if (rideId === 'mock-offer-123' || currentRide?.status === 'pending') {
                toastTitle = "Offer Declined";
                toastMessage = `Ride offer for ${rideDisplayName} declined.`;
                if (rideId !== 'mock-offer-123' && currentRide?.status === 'pending') {
                    setRideRequests(prev => prev.filter(r => r.id !== rideId));
                }
            } else {
                newStatus = 'declined';
                apiAction = undefined;
                toastTitle = "Ride Declined";
                toastMessage = `Ride request for ${rideDisplayName} declined.`;
                setRideRequests(prev => prev.filter(r => r.id !== rideId));
            }
            break;
        case 'notify_arrival':
            newStatus = 'arrived_at_pickup';
            apiAction = 'notify_arrival';
            toastTitle = "Passenger Notified";
            toastMessage = `Passenger ${rideDisplayName} has been notified of your arrival.`;
            break;
        case 'start_ride':
            newStatus = 'in_progress';
            apiAction = 'start_ride';
            toastTitle = "Ride Started";
            toastMessage = `Ride with ${rideDisplayName} is now in progress.`;
            break;
        case 'complete_ride':
            newStatus = 'completed';
            apiAction = 'complete_ride';
            toastTitle = "Ride Completed";
            toastMessage = `Ride with ${rideDisplayName} marked as completed.`;
            break;
        case 'cancel_active':
            newStatus = 'cancelled_by_driver';
            apiAction = undefined;
            toastTitle = "Ride Cancelled";
            toastMessage = `Active ride with ${rideDisplayName} cancelled.`;
            setRideRequests(prev => prev.filter(r => r.id !== rideId));
            break;
    }

    if ((newStatus || apiAction) && rideId !== 'mock-offer-123') {
        try {
            const payload: any = {};
            if (apiAction) {
                 payload.action = apiAction;
            } else if (newStatus) {
                payload.status = newStatus;
                if (actionType === 'accept' && driverUser) {
                    payload.driverId = driverUser.id;
                    payload.driverName = driverUser.name;
                }
            } else {
                setActionLoading(prev => ({ ...prev, [rideId]: false }));
                return;
            }

            const response = await fetch(`/api/operator/bookings/${rideId}`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(payload),
            });

             if (!response.ok) {
                let apiErrorMessage = `Failed to update ride status (Status: ${response.status}).`;
                const responseText = await response.text();
                try {
                    const errorData = JSON.parse(responseText);
                    console.error(`API Error for ride ${rideId}, action ${actionType}:`, errorData);
                    apiErrorMessage = errorData.message || errorData.details || JSON.stringify(errorData);
                } catch (parseError) {
                    console.warn(`API response for ride ${rideId} (status ${response.status}) not valid JSON or error parsing it:`, parseError);
                    console.log("Raw error response body:", responseText);
                    apiErrorMessage = `Status: ${response.status}. Body: ${responseText.substring(0,200)}`;
                }
                throw new Error(apiErrorMessage);
            }

             const updatedBookingData = await response.json();
             const updatedBooking = updatedBookingData.booking;

            setRideRequests(prevRequests =>
                prevRequests.map(req => {
                    if (req.id === rideId) {
                        const updatedReq: RideRequest = { ...req, status: updatedBooking.status };
                        if (updatedBooking.notifiedPassengerArrivalTimestamp) {
                            updatedReq.notifiedPassengerArrivalTimestamp = new Date(updatedBooking.notifiedPassengerArrivalTimestamp._seconds * 1000).toISOString();
                        }
                        if (updatedBooking.passengerAcknowledgedArrivalTimestamp) {
                           updatedReq.passengerAcknowledgedArrivalTimestamp = new Date(updatedBooking.passengerAcknowledgedArrivalTimestamp._seconds * 1000).toISOString();
                        }
                        return updatedReq;
                    }
                    return req;
                })
            );
            toast({ title: toastTitle, description: toastMessage });

        } catch (error) {
             console.error(`Error in handleRideAction for ride ${rideId}, action ${actionType}:`, error);
             toast({ title: "Action Failed", description: `Could not update ride: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive"});
        } finally {
            setActionLoading(prev => ({ ...prev, [rideId]: false }));
        }
    } else if (rideId === 'mock-offer-123' && (actionType === 'accept' || actionType === 'decline')) {
        toast({ title: toastTitle, description: toastMessage });
        setActionLoading(prev => ({ ...prev, [rideId]: false }));
    } else {
        if (actionType !== 'decline' && actionType !== 'cancel_active') {
             setActionLoading(prev => ({ ...prev, [rideId]: false }));
        }
    }
  };

  const activeRide = rideRequests.find(r => ['driver_assigned', 'arrived_at_pickup', 'in_progress'].includes(r.status));

  const handleCallCustomer = (phoneNumber?: string) => {
    if (phoneNumber) {
      toast({ title: "Calling Customer", description: `Initiating call to ${phoneNumber}... (Demo)`});
    } else {
      toast({ title: "Call Not Available", description: "Customer phone number not provided.", variant: "default"});
    }
  };

  const renderPassengerRating = (rating?: number) => {
    if (typeof rating !== 'number' || rating <= 0) {
      return <span className="text-xs text-muted-foreground ml-1.5">(No rating)</span>;
    }
    const totalStars = 5;
    const filledStars = Math.round(rating);
    return (
      <div className="flex items-center ml-1.5">
        {[...Array(totalStars)].map((_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${i < filledStars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        ))}
        <span className="ml-1 text-xs text-muted-foreground">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const getMapMarkersForActiveRide = () => {
    const markers = [];
     if (isDriverOnline && driverLocation && blueDotSvgDataUrl) {
        markers.push({
            position: driverLocation,
            title: "Your Current Location",
            iconUrl: blueDotSvgDataUrl,
            iconScaledSize: { width: 24, height: 24 }
        });
    }
    if (!activeRide) return markers;

    if (activeRide.pickupCoords) {
      markers.push({
        position: activeRide.pickupCoords,
        title: `Pickup: ${activeRide.pickupLocation}`, label: 'P'
      });
    }
    if (activeRide.dropoffCoords) {
      markers.push({
        position: activeRide.dropoffCoords,
        title: `Dropoff: ${activeRide.dropoffLocation}`, label: 'D'
      });
    }
    return markers;
  };

  const getMapCenterForActiveRide = () => {
    if (isDriverOnline && driverLocation) return driverLocation;
    if (activeRide?.status === 'driver_assigned' && activeRide.pickupCoords) {
      return activeRide.pickupCoords;
    }
    if (activeRide?.status === 'arrived_at_pickup' && activeRide.pickupCoords) {
      return activeRide.pickupCoords;
    }
    if (activeRide?.status === 'in_progress' && activeRide.dropoffCoords) {
      return activeRide.dropoffCoords;
    }
    return huddersfieldCenterGoogle;
  };

  const handleNavigate = (locationName: string, coords?: {lat: number, lng: number}) => {
      if(coords) {
        toast({title: "Navigation Started (Demo)", description: `Navigating to ${locationName} at ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`});
      } else {
        toast({title: "Navigation Error", description: `Coordinates for ${locationName} not available.` , variant: "destructive"});
      }
  };

  const mapMarkers = [];
  if (isDriverOnline && driverLocation && blueDotSvgDataUrl) {
    mapMarkers.push({
        position: driverLocation,
        title: "Your Current Location",
        iconUrl: blueDotSvgDataUrl,
        iconScaledSize: { width: 24, height: 24 }
    });
  }

  // Fallback return for when no ride is active
  return (
    <div className="flex flex-col h-full">
      <div className="w-full relative h-[60vh]"> {/* Map takes roughly 60% of height */}
        <GoogleMapDisplay
            center={driverLocation}
            zoom={15}
            markers={mapMarkers}
            className="w-full h-full"
            disableDefaultUI={true}
            fitBoundsToMarkers={false} // Keep centered on driver unless markers are far
        />
      </div>
      <Card className="flex-grow h-[40vh] rounded-t-2xl -mt-4 shadow-2xl bg-card flex flex-col p-2">
        <CardHeader className="p-1 text-center border-b">
          <CardTitle className="text-lg font-semibold">
            {isDriverOnline ? "Online - Awaiting Offers" : "Offline"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center p-2 gap-1.5 flex-grow">
          {isDriverOnline ? (
            <>
              {geolocationError ? (
                <div className="text-center text-destructive p-2 bg-destructive/10 rounded-md">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-1" />
                  <p className="text-sm font-semibold">Location Error</p>
                  <p className="text-xs">{geolocationError}</p>
                </div>
              ) : (
                 <>
                    <Progress value={progressValue} className="w-3/4 h-2.5" />
                    <p className="text-xs text-muted-foreground mt-1.5">System Active - Searching for Offers...</p>
                 </>
              )}
            </>
          ) : (
            <Power className="h-10 w-10 text-muted-foreground" />
          )}
           <div className="flex items-center space-x-2">
            <Switch
              id="online-status-toggle"
              checked={isDriverOnline}
              onCheckedChange={setIsDriverOnline}
              aria-label={isDriverOnline ? "Go Offline" : "Go Online"}
            />
            <Label htmlFor="online-status-toggle" className="text-sm font-medium">
              {isDriverOnline ? "Online" : "Offline"}
            </Label>
          </div>
          <Button variant="outline" onClick={handleSimulateOffer} className="h-7 px-3 py-1 text-xs">
            Simulate Incoming Offer
          </Button>
        </CardContent>
      </Card>
      <RideOfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        onAccept={handleAcceptOffer}
        onDecline={handleDeclineOffer}
        rideDetails={currentOfferDetails}
      />
    </div>
  );
}

    