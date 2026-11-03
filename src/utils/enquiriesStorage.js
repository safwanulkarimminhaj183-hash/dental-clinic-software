const ENQUIRIES_KEY = 'dentocare_treatment_enquiries';

export const getLocalEnquiries = () => {
  try {
    const data = localStorage.getItem(ENQUIRIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Failed to parse local enquiries:', err);
    return [];
  }
};

export const saveLocalEnquiries = (enquiries) => {
  try {
    localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(enquiries));
  } catch (err) {
    console.error('Failed to save local enquiries:', err);
  }
};

export const addLocalEnquiry = (enquiry) => {
  try {
    const list = getLocalEnquiries();
    const newEnquiry = {
      ...enquiry,
      id: enquiry.id || enquiry._id || 'enq_' + Date.now(),
      _id: enquiry._id || enquiry.id || 'enq_' + Date.now(),
      status: enquiry.status || 'New',
      createdAt: enquiry.createdAt || new Date().toISOString(),
    };
    list.unshift(newEnquiry);
    saveLocalEnquiries(list);
    window.dispatchEvent(new CustomEvent('enquiriesUpdated', { detail: newEnquiry }));
    return newEnquiry;
  } catch (err) {
    console.error('Failed to add local enquiry:', err);
    return enquiry;
  }
};

export const updateLocalEnquiryStatus = (id, status) => {
  try {
    const list = getLocalEnquiries();
    const updated = list.map((item) =>
      item._id === id || item.id === id ? { ...item, status } : item
    );
    saveLocalEnquiries(updated);
    window.dispatchEvent(new CustomEvent('enquiriesUpdated'));
  } catch (err) {
    console.error('Failed to update local enquiry status:', err);
  }
};

export const deleteLocalEnquiry = (id) => {
  try {
    const list = getLocalEnquiries();
    const filtered = list.filter((item) => item._id !== id && item.id !== id);
    saveLocalEnquiries(filtered);
    window.dispatchEvent(new CustomEvent('enquiriesUpdated'));
  } catch (err) {
    console.error('Failed to delete local enquiry:', err);
  }
};

export const mergeEnquiries = (serverEnquiries = [], localEnquiries = []) => {
  const map = new Map();

  // Local enquiries can come first as default or fallback
  localEnquiries.forEach((item) => {
    const id = item._id || item.id;
    if (id) {
      map.set(id, { ...item, _id: id, id });
    }
  });

  // Server enquiries override or augment local entries
  serverEnquiries.forEach((item) => {
    const id = item._id || item.id;
    if (id) {
      map.set(id, { ...item, _id: id, id });
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
};
