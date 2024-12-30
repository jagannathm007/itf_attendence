let app = angular.module("itf", []);

app.filter("to_trusted", [
  "$sce",
  function ($sce) {
    return function (text) {
      return $sce.trustAsHtml(text);
    };
  },
]);

//LOGIN CONTROLLER
app.controller("LoginController", ($scope, $http) => {
  (() => {
    let cred = getStorage(constants.session.userCredentials);
    if (cred != null) {
      window.location.href = "task.html";
    }
  })();

  $scope.form = { emailId: "", password: "" };
  $scope.onSubmit = () => {
    $http
      .post(constants.endpoints.login, $scope.form)
      .then((response) => {
        let extract = extractResponse(response);
        if (extract.data != 0) {
          setStorage(constants.session.token, extract.data.token);
          setStorage(constants.session.userCredentials, extract.data);
          window.location.href = "task.html";
        } else {
          errorToast(extract.message);
        }
      })
      .catch((err) => {
        let message = handleApiError(err);
        errorToast(message);
      });
  };
});

//TASK CONTROLLER
app.controller("TaskController", ($scope, $interval, $http) => {
  $scope.userData = null;
  $scope.taskStatus = ["pending", "hold", "completed"];

  (async () => {
    $scope.userData = getStorage(constants.session.userCredentials);
    if ($scope.userData == null) {
      window.location.href = "index.html";
    }
  })();

  
  $scope.takeMeToChangePassword = () => (window.location.href = "change-password.html");
  $scope.takeMeToLeave = () => (window.location.href = "leave.html");

  $scope.logout = () => {
    clearAllStorage();
    window.location.href = "index.html";
  };

  $scope.todayTasks = [];
  $scope.time = { startTime: 0, endTime: 0, totalTime: 0 };

  $scope.addTask = () => {
    let object = { taskName: "", status: "pending" };
    $scope.todayTasks.push(object);
  };

  $scope.deleteTask = (task) => {
    let index = $scope.todayTasks.indexOf(task);
    $scope.todayTasks.splice(index, 1);
  };

  $scope._getCurrentLocation = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => reject(err)
        );
      });
      console.log("Position:", position.coords.latitude, position.coords.longitude);
    } catch (error) {
      console.error("Error getting location:", error);
    }
  };

  $scope.formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  $scope.getTimeDifference = (timestamp1, timestamp2) => {
    const time1 = Number(timestamp1);
    const time2 = Number(timestamp2);
    const diffInMilliseconds = Math.abs(time2 - time1);
    const totalSeconds = Math.floor(diffInMilliseconds / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;
    hours = String(hours).padStart(2, "0");
    minutes = String(minutes).padStart(2, "0");
    seconds = String(seconds).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  $scope.intervalWatch = null;
  $scope.toggleTaskTime = async () => {
    if ($scope.time.startTime == 0) {
      if ($scope.todayTasks.length > 0) {
        $scope.time.startTime = Date.now();
        setStorage(constants.session.timeStatus, "started");
        $scope.saveTimer();
        successToast("Timer started.");
      } else {
        errorToast("Please add task to start timer.");
      }
    } else {
      $scope.time.endTime = Date.now();
      $interval.cancel($scope.intervalWatch);
      $scope.intervalWatch = null;
      setStorage(constants.session.timeStatus, "ended");
      $scope.saveTimer();
    }
  };

  $scope.lastSummary = { startTime: 0, endTime: 0, toalTime: 0 };
  $scope.getTimer = async () => {
    try {
      let headers = {
        headers: {
          Authorization: `Bearer ${$scope.userData.token}`,
          "Content-Type": "application/json",
        },
      };
      let response = await $http.post(constants.endpoints.getTimer, {}, headers);
      let extract = extractResponse(response);
      $scope.$apply(()=>{
        if (extract.data != 0 && Array.isArray(extract.data)) {
          $scope.todayTasks = extract.data[0].tasks;
          setStorage(constants.session.timeStatus, extract.data[0].timeStatus);
          if (extract.data[0].timeStatus == "started") {
            $scope.time.startTime = Number(extract.data[0].timeSummary[0].startTime);
            $scope.intervalWatch = $interval(() => {
              $scope.time.totalTime = $scope.getTimeDifference($scope.time.startTime, Date.now());
            }, 1000);
          } else {
            $scope.time = { startTime: 0, endTime: 0, totalTime: 0 };
            $scope.lastSummary.endTime = Number(extract.data[0].timeSummary[extract.data[0].timeSummary.length - 1].endTime);
            $scope.lastSummary.startTime = Number(extract.data[0].timeSummary[extract.data[0].timeSummary.length - 1].startTime);
            $scope.lastSummary.totalTime = Number(extract.data[0].timeSummary[extract.data[0].timeSummary.length - 1].totalTime);
          }
        }
      });
    } catch (err) {
      errorToast(err.toString());
    }
  };

  $scope.isLoading = false;
  $scope.saveTimer = async () => {
    $scope.isLoading = true;
    try {
      let status = getStorage(constants.session.timeStatus);
      let json = {
        startTime: $scope.time.startTime,
        endTime: $scope.time.endTime,
        totalTime: $scope.time.totalTime != 0 ? $scope.time.endTime - $scope.time.startTime : 0,
        tasks: angular.copy($scope.todayTasks),
        timeStatus: status,
      };
      let headers = {
        headers: {
          Authorization: `Bearer ${$scope.userData.token}`,
          "Content-Type": "application/json",
        },
      };
      let response = await $http.post(constants.endpoints.saveTimer, json, headers);
      let extract = extractResponse(response);
      if (extract.data != 0) {
        window.location.reload();
      }
    } catch (err) {
      errorToast(err.toString());
    } finally {
      $scope.isLoading = false;
    }
  };

  $scope.isTodayHoliday = false;
  $scope.getTodayHoliday = async () => {
    try {
      let headers = {
        headers: {
          Authorization: `Bearer ${$scope.userData.token}`,
          "Content-Type": "application/json",
        },
      };
      let response = await $http.post(constants.endpoints.isTodayHoliday, {}, headers);
      let extract = extractResponse(response);
      $scope.$apply(()=>{
        if (Array.isArray(extract.data) && extract.data.length > 0) {
          $scope.isTodayHoliday = true;
        } else {
          $scope.isTodayHoliday = false;
        }
      });
    } catch (err) {
      errorToast(err.toString());
    }
  };

  $scope.hasSummary = false;
  $scope.summaryTasks = [];
  $scope.upcomingLeaves = [];
  $scope.getSummary = async () => {
    try {
      let headers = {
        headers: {
          Authorization: `Bearer ${$scope.userData.token}`,
          "Content-Type": "application/json",
        },
      };
      let response = await $http.post(constants.endpoints.summary, {}, headers);
      let extract = extractResponse(response);
      if (extract.data != 0) {
        $scope.$apply(()=>{
          $scope.hasSummary = true;
          $scope.summaryTasks = extract.data.tasks;
          $scope.upcomingLeaves = extract.data.upcomingLeaves;
        });
      }
    } catch (err) {
      errorToast(err.toString());
    }
  };

  $scope.initialLoading = true;
  $scope.refresh = async () => {
    $scope.initialLoading = true;
    await $scope.getTodayHoliday();
    await $scope.getSummary();
    await $scope.getTimer();
    $scope.$apply(()=>{
      $scope.initialLoading = false;
    });
  };
  $scope.refresh();
});

//PASSWORD CHANGE CONTROLLER
app.controller("ChangePasswordController", ($scope, $http) => {
  $scope.userData = null;
  (async () => {
    $scope.userData = getStorage(constants.session.userCredentials);
    if ($scope.userData == null) {
      window.location.href = "index.html";
    }
  })();

  $scope.form = { oldPassword: "", newPassword: "" };

  $scope.reset = () => {
    $scope.form = { oldPassword: "", newPassword: "" };
  };

  $scope.onSubmit = () => {
    $http
      .post(constants.endpoints.changePassword, $scope.form, {
        headers: {
          Authorization: `Bearer ${$scope.userData.token}`,
          "Content-Type": "application/json",
        },
      })
      .then((response) => {
        let extract = extractResponse(response);
        if (extract.data != 0) {
          $scope.reset();
          successToast("Password updated successfully!");
        } else {
          errorToast(extract.message);
        }
      })
      .catch((err) => {
        $scope.isLoading = false;
        let message = handleApiError(err);
        errorToast(message);
      });
  };
});

//LEAVE
app.controller("LeaveController", ($scope, $http) => {
  $scope.userData = null;
  (async () => {
    $scope.userData = getStorage(constants.session.userCredentials);
    if ($scope.userData == null) {
      window.location.href = "index.html";
    }
  })();

  const today = new Date();
  const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const lastDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  $scope.date = {
    minDate: firstDayOfNextMonth.toISOString().split("T")[0],
    maxDate: lastDayOfNextMonth.toISOString().split("T")[0],
  };

  $scope.form = {
    leaveFrom: null,
    leaveTo: null,
    reason: "",
    isReportedToManager: false,
    managerName: "",
  };

  $scope.reset = () => {
    $scope.form = {
      leaveFrom: null,
      leaveTo: null,
      reason: "",
      isReportedToManager: false,
      managerName: "",
    };
  };

  $scope.onSubmit = () => {
    console.log($scope.form);
    $http
      .post(constants.endpoints.saveLeave, $scope.form, {
        headers: {
          Authorization: `Bearer ${$scope.userData.token}`,
          "Content-Type": "application/json",
        },
      })
      .then((response) => {
        let extract = extractResponse(response);
        if (extract.data != 0) {
          $scope.reset();
          successToast("Leave infomation saved!");
        } else {
          errorToast(extract.message);
        }
      })
      .catch((err) => {
        $scope.isLoading = false;
        let message = handleApiError(err);
        errorToast(message);
      });
  };
});
