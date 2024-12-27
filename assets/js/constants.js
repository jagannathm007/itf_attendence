let isDevelopment = true;
let baseURL = isDevelopment ? "http://localhost:3100/api/employee" :  "http://back.realmotors.in/api/employee";
let constants = {
  session: {
    userCredentials: "_userCredentials",
    token: "_token",
    timeData: "_timeData",
    timeStatus: "_timeStatus",
  },
  endpoints: {
    login: `${baseURL}/signIn`,
    getTimer: `${baseURL}/timer/find`,
    saveTimer: `${baseURL}/timer`,
    changePassword: `${baseURL}/change-password`,
  },
};

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

const extractResponse = (response) => response.data;

const errorToast = (message) => {
  Toast.fire({ icon: "error", title: message });
};

const successToast = (message) => {
  Toast.fire({ icon: "success", title: message });
};


const setStorage = (key, value) =>{
  localStorage.setItem(key, JSON.stringify(value));
}

const getStorage = (key) => {
  let data = localStorage.getItem(key);
  return data!=null ? JSON.parse(data): null;
}

const clearAllStorage = () => localStorage.clear();

const handleApiError = (error) => {
  if (error.status === 0) {
    return "Network error: Please check your internet connection.";
  } else if (error.status === 401) {
    clearAllStorage();
    window.location.href = "index.html";
    return "Error 401: Unauthorized access. Please check your credentials.";
  } else if (error.status === 403) {
    return "Error 403: Forbidden. You do not have permission to access this resource.";
  } else if (error.status === 404) {
    return "Error 404: Resource not found.";
  } else if (error.status === 500) {
    return "Error 500: Internal server error.";
  } else {
    return `Unexpected error (${error.status}): ${error.statusText}`;
  }
};
