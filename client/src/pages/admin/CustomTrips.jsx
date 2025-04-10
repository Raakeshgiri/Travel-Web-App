import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const CustomTrips = () => {
  const [customTrips, setCustomTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedTrip, setSelectedTrip] = useState(null);

  const getCustomTrips = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customTrip');
      const data = await res.json();
      
      if (!data.success) {
        setError(data.message || 'Failed to fetch custom trips');
        setCustomTrips([]);
      } else {
        setCustomTrips(data.data || []);
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch custom trips');
      setCustomTrips([]);
      console.error('Error fetching custom trips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCustomTrips();
  }, []);

  const handleStatusUpdate = async (tripId, newStatus) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customTrip/${tripId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await res.json();
      if (data.success === false) {
        alert(data.message);
      } else {
        getCustomTrips(); // Refresh the list
      }
    } catch (err) {
      alert('Failed to update trip status');
      console.error('Error updating trip status:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrips = customTrips.filter(trip => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        trip.tourPlan.destination.toLowerCase().includes(searchLower) ||
        trip.userDetails.name.toLowerCase().includes(searchLower) ||
        trip.userDetails.email.toLowerCase().includes(searchLower)
      );
    }
    if (filter === 'pending') return trip.status === 'pending';
    if (filter === 'approved') return trip.status === 'approved';
    if (filter === 'completed') return trip.status === 'completed';
    return true;
  });

  const TripListItem = ({ trip }) => (
    <div 
      onClick={() => setSelectedTrip(trip)}
      className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
        selectedTrip?._id === trip._id ? 'border-blue-500 bg-blue-50' : ''
      }`}
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{trip.tourPlan.destination}</h3>
          <p className="text-sm text-gray-600">{trip.userDetails.name}</p>
          <p className="text-xs text-gray-500">{new Date(trip.createdAt).toLocaleDateString()}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${
          trip.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
          trip.status === 'approved' ? 'bg-green-200 text-green-800' :
          trip.status === 'completed' ? 'bg-blue-200 text-blue-800' :
          'bg-red-200 text-red-800'
        }`}>
          {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
        </span>
      </div>
    </div>
  );

  const TripDetails = ({ trip }) => (
    <div className="border rounded-lg p-6 bg-white">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{trip.tourPlan.destination}</h2>
          <p className="text-gray-600">Requested by: {trip.userDetails.name}</p>
          <p className="text-gray-500">{trip.userDetails.email}</p>
        </div>
        <button 
          onClick={() => setSelectedTrip(null)}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p><strong>Duration:</strong> {trip.tourPlan.duration}</p>
          <p><strong>People:</strong> {trip.tourPlan.people}</p>
          <p><strong>Budget:</strong> {trip.tourPlan.budget}</p>
        </div>
        <div>
          <p><strong>Status:</strong> <span className={`px-3 py-1 rounded-full text-sm ${
            trip.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
            trip.status === 'approved' ? 'bg-green-200 text-green-800' :
            trip.status === 'completed' ? 'bg-blue-200 text-blue-800' :
            'bg-red-200 text-red-800'
          }`}>{trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}</span></p>
          <p><strong>Created:</strong> {new Date(trip.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Itinerary</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <ul className="space-y-2">
            {trip.tourPlan.itinerary.map((day, index) => (
              <li key={index}>
                <strong>{day.day}:</strong> {day.activities}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">Accommodations</h3>
          <p className="bg-gray-50 p-4 rounded-lg">{trip.tourPlan.accommodations}</p>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">Transportation</h3>
          <p className="bg-gray-50 p-4 rounded-lg">{trip.tourPlan.transportation}</p>
        </div>
      </div>

      {trip.status === 'pending' && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleStatusUpdate(trip._id, 'approved')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            disabled={loading}
          >
            Approve
          </button>
          <button
            onClick={() => handleStatusUpdate(trip._id, 'rejected')}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            disabled={loading}
          >
            Reject
          </button>
        </div>
      )}

      {trip.status === 'approved' && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleStatusUpdate(trip._id, 'completed')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            disabled={loading}
          >
            Mark as Completed
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="shadow-xl rounded-lg w-full flex flex-col p-5 gap-4">
      {loading && <div className="text-center text-lg">Loading...</div>}
      {error && <div className="text-center text-red-500">{error}</div>}
      
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search by destination, user, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2 border rounded-lg w-64"
        />
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg ${filter === 'pending' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg ${filter === 'approved' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg ${filter === 'completed' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Completed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {filteredTrips.map((trip) => (
            <TripListItem key={trip._id} trip={trip} />
          ))}
          
          {filteredTrips.length === 0 && !loading && (
            <div className="text-center text-gray-500 py-8">
              No custom trips found
            </div>
          )}
        </div>

        <div className="col-span-2">
          {selectedTrip ? (
            <TripDetails trip={selectedTrip} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a trip to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomTrips; 