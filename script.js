/* =========================================================
   CAMPUSFLOW V4
   Smart Queue & Office Management

   FLOW:
   Student
      ↓
   Get Token
      ↓
   Live Queue
      ↓
   Office Dashboard
      ↓
   Call Next
      ↓
   Student Notification
      ↓
   Mark Served
      ↓
   Smart Journey Advances

   IMPORTANT:
   NO AUTO QUEUE SIMULATION.
   Only the clock uses setInterval().
========================================================= */


/* =========================================================
   1. DATA
========================================================= */

const offices = {

  "Accounts": {
    name: "Accounts Office",
    prefix: "A-",

    current: 37,

    queue: [38, 39, 40, 41, 42],

    nextToken: 43,

    estimate: 12,

    serviceTime: 2,

    serving: null,

    served: 37
  },


  "Exam Cell": {
    name: "Exam Cell",
    prefix: "E-",

    current: 21,

    queue: [22, 23, 24, 25, 26],

    nextToken: 27,

    estimate: 8,

    serviceTime: 2,

    serving: null,

    served: 21
  },


  "Scholarship": {
    name: "Scholarship Cell",
    prefix: "S-",

    current: 14,

    queue: [
      15, 16, 17, 18, 19,
      20, 21, 22, 23, 24, 25
    ],

    nextToken: 26,

    estimate: 19,

    serviceTime: 2,

    serving: null,

    served: 14
  },


  "Administration": {
    name: "Administration Office",
    prefix: "AD-",

    current: 15,

    queue: [16, 17, 18],

    nextToken: 19,

    estimate: 6,

    serviceTime: 2,

    serving: null,

    served: 15
  }

};


/* =========================================================
   2. SMART JOURNEYS
========================================================= */

const serviceJourneys = {

  "Scholarship Renewal": {

    steps: [
      {
        office: "Department",
        description: "Document verification"
      },

      {
        office: "Accounts",
        description: "Fee / payment verification"
      },

      {
        office: "Scholarship",
        description: "Scholarship application processing"
      }
    ]

  }

};


/* =========================================================
   3. DOM ELEMENTS
========================================================= */

const navItems =
  document.querySelectorAll(".nav-item");

const sections =
  document.querySelectorAll(".section");


const tokenModal =
  document.getElementById("tokenModal");

const generatedModal =
  document.getElementById("generatedModal");


const modalOffice =
  document.getElementById("modalOffice");

const modalCurrent =
  document.getElementById("modalCurrent");

const modalWaiting =
  document.getElementById("modalWaiting");

const modalEstimate =
  document.getElementById("modalEstimate");


const generatedToken =
  document.getElementById("generatedToken");

const generatedOffice =
  document.getElementById("generatedOffice");

const generatedCurrent =
  document.getElementById("generatedCurrent");

const generatedAhead =
  document.getElementById("generatedAhead");

const generatedWait =
  document.getElementById("generatedWait");

const queueProgress =
  document.getElementById("queueProgress");


const toast =
  document.getElementById("toast");

const toastTitle =
  document.getElementById("toastTitle");

const toastMessage =
  document.getElementById("toastMessage");


const officeSelector =
  document.getElementById("officeSelector");


/* =========================================================
   4. APPLICATION STATE
========================================================= */

let selectedOffice = "Accounts";

let selectedService = "Fee Payment";


/*
   ACTIVE TOKEN

   Example:

   {
      office: "Accounts",
      number: 43,
      display: "A-43"
   }
*/

let activeToken = null;


let notificationsEnabled = false;

let tokenWasCalled = false;

let selectedOfficeDashboard = "Accounts";


/*
   Smart Journey state

   0 = not started
   1 = Accounts
   2 = Scholarship
   3 = completed
*/

let activeJourney = null;

let journeyCurrentStep = 0;


/* =========================================================
   5. HELPERS
========================================================= */

function setText(id, value) {

  const element =
    document.getElementById(id);

  if (element) {
    element.textContent = value;
  }

}


function getTokenDisplay(
  office,
  number
) {

  if (!offices[office]) {
    return "";
  }

  return (
    offices[office].prefix +
    number
  );

}


/* =========================================================
   6. NAVIGATION
========================================================= */

navItems.forEach(item => {

  item.addEventListener(
    "click",
    () => {

      const target =
        item.dataset.section;

      switchSection(target);

    }
  );

});


function switchSection(sectionId) {

  navItems.forEach(item => {

    item.classList.toggle(
      "active",
      item.dataset.section === sectionId
    );

  });


  sections.forEach(section => {

    section.classList.remove(
      "active-section"
    );

  });


  const targetSection =
    document.getElementById(sectionId);


  if (targetSection) {

    targetSection.classList.add(
      "active-section"
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }


  /*
     Refresh dashboard whenever
     it becomes visible.
  */

  if (
    sectionId === "officeDashboard"
  ) {

    renderOfficeDashboard();

  }


  if (
    sectionId === "journey"
  ) {

    updateSmartJourney();

  }

}


/* =========================================================
   7. SERVICE CARDS
========================================================= */

const serviceCards =
  document.querySelectorAll(
    ".service-card, .large-service-card"
  );


serviceCards.forEach(card => {

  card.addEventListener(
    "click",
    () => {

      const service =
        card.dataset.service;

      openTokenModal(service);

    }
  );

});


/* =========================================================
   8. OPEN TOKEN MODAL
========================================================= */

function openTokenModal(service) {

  /*
     Scholarship Renewal is a
     multi-office journey.

     It ALWAYS starts at Accounts.
  */

  if (
    service === "Scholarship Renewal"
  ) {

    service = "Accounts";

  }


  if (!offices[service]) {
    return;
  }


  selectedOffice = service;


  const data =
    offices[service];


  modalOffice.textContent =
    data.name;


  modalCurrent.textContent =
    data.prefix +
    data.current;


  modalWaiting.textContent =
    data.queue.length;


  modalEstimate.textContent =
    "~" +
    data.estimate +
    " min";


  /*
     Reset service options.
  */

  const options =
    document.querySelectorAll(
      ".service-option"
    );


  options.forEach(option => {

    option.classList.remove(
      "selected"
    );

  });


  /*
     If we are inside a Smart Journey,
     select Scholarship Renewal.
  */

  if (
    activeJourney ===
      "Scholarship Renewal" &&
    journeyCurrentStep === 1
  ) {

    const scholarshipOption =
      document.querySelector(
        '.service-option[data-option="Scholarship Renewal"]'
      );


    if (scholarshipOption) {

      scholarshipOption.classList.add(
        "selected"
      );

      selectedService =
        "Scholarship Renewal";

    }

  } else {

    const firstOption =
      document.querySelector(
        ".service-option"
      );


    if (firstOption) {

      firstOption.classList.add(
        "selected"
      );

      selectedService =
        firstOption.dataset.option;

    }

  }


  tokenModal.classList.add(
    "show"
  );


  document.body.style.overflow =
    "hidden";

}


/* =========================================================
   9. CLOSE TOKEN MODAL
========================================================= */

const closeModal =
  document.getElementById(
    "closeModal"
  );


if (closeModal) {

  closeModal.addEventListener(
    "click",
    closeTokenModal
  );

}


function closeTokenModal() {

  if (tokenModal) {

    tokenModal.classList.remove(
      "show"
    );

  }

  document.body.style.overflow =
    "";

}


/* =========================================================
   10. SERVICE OPTIONS
========================================================= */

const serviceOptions =
  document.querySelectorAll(
    ".service-option"
  );


serviceOptions.forEach(option => {

  option.addEventListener(
    "click",
    () => {

      serviceOptions.forEach(item => {

        item.classList.remove(
          "selected"
        );

      });


      option.classList.add(
        "selected"
      );


      selectedService =
        option.dataset.option;


      /*
         Scholarship Renewal
         starts from Accounts.

         If user selects it from
         another office, automatically
         route them to Accounts.
      */

      if (
        selectedService ===
        "Scholarship Renewal"
      ) {

        selectedOffice =
          "Accounts";


        const data =
          offices["Accounts"];


        modalOffice.textContent =
          data.name;


        modalCurrent.textContent =
          data.prefix +
          data.current;


        modalWaiting.textContent =
          data.queue.length;


        modalEstimate.textContent =
          "~" +
          data.estimate +
          " min";


        showToast(
          "Smart route",
          "Scholarship Renewal starts at Accounts Office."
        );

      }

    }
  );

});


/* =========================================================
   11. GET TOKEN BUTTON
========================================================= */

const getTokenBtn =
  document.getElementById(
    "getTokenBtn"
  );


if (getTokenBtn) {

  getTokenBtn.addEventListener(
    "click",
    generateToken
  );

}


/* =========================================================
   12. GENERATE TOKEN
========================================================= */

function generateToken() {

  /*
     Prevent duplicate active tokens.
  */

  if (activeToken) {

    showToast(
      "Active token exists",
      `${activeToken.display} is already being tracked.`
    );

    return;

  }


  /*
     Decide which office should
     receive the token.
  */

  let targetOffice =
    selectedOffice;


  /*
     Scholarship Renewal:
     
     STEP 1 → Accounts
     STEP 2 → Scholarship
  */

  if (
    selectedService ===
    "Scholarship Renewal"
  ) {

    if (
      activeJourney ===
        "Scholarship Renewal" &&
      journeyCurrentStep === 2
    ) {

      targetOffice =
        "Scholarship";

    } else {

      targetOffice =
        "Accounts";

    }

  }


  const data =
    offices[targetOffice];


  if (!data) {
    return;
  }


  /*
     Create token.
  */

  const newNumber =
    data.nextToken;


  data.nextToken += 1;


  /*
     Add token to queue.
  */

  data.queue.push(
    newNumber
  );


  /*
     Keep waiting count
     synchronized.
  */

  data.waiting =
    data.queue.length;


  /*
     Create active token.
  */

  activeToken = {

    office: targetOffice,

    number: newNumber,

    display:
      data.prefix +
      newNumber

  };


  /*
     Dashboard automatically
     switches to the correct office.
  */

  selectedOfficeDashboard =
    targetOffice;


  if (officeSelector) {

    officeSelector.value =
      targetOffice;

  }


  /*
     Activate Smart Journey
     when required.
  */

  if (
    selectedService ===
    "Scholarship Renewal"
  ) {

    if (!activeJourney) {

      activeJourney =
        "Scholarship Renewal";

      journeyCurrentStep =
        1;

    }

  }


  tokenWasCalled =
    false;


  notificationsEnabled =
    false;


  /*
     Reset notification button.
  */

  resetNotificationButton();


  /*
     Display generated token.
  */

  generatedToken.textContent =
    activeToken.display;


  generatedOffice.textContent =
    data.name;


  generatedCurrent.textContent =
    data.prefix +
    data.current;


  /*
     Calculate queue position.
  */

  const ahead =
    getPeopleAhead(
      targetOffice,
      newNumber
    );


  const wait =
    calculateWait(
      targetOffice,
      newNumber
    );


  generatedAhead.textContent =
    ahead;


  generatedWait.textContent =
    "~" +
    wait +
    " min";


  /*
     Progress bar.
  */

  queueProgress.style.width =
    calculateProgress(
      data.current,
      newNumber
    ) +
    "%";


  /*
     Close token modal.
  */

  closeTokenModal();


  /*
     Open generated token modal.
  */

  setTimeout(
    () => {

      if (generatedModal) {

        generatedModal.classList.add(
          "show"
        );

      }

      document.body.style.overflow =
        "hidden";

    },
    180
  );


  /*
     Update all student views.
  */

  updateStudentQueue();


  updateSmartJourney();


  renderOfficeDashboard();


  updateServiceCards();


  showToast(
    "Token confirmed ✓",
    `${activeToken.display} has been added to the ${data.name} queue.`
  );

}


/* =========================================================
   13. QUEUE CALCULATIONS
========================================================= */

function getPeopleAhead(
  office,
  tokenNumber
) {

  const data =
    offices[office];


  if (!data) {
    return 0;
  }


  /*
     If token is currently being served,
     nobody is ahead.
  */

  if (
    data.serving ===
    tokenNumber
  ) {

    return 0;

  }


  /*
     If token is the current token,
     nobody is ahead.
  */

  if (
    data.current ===
    tokenNumber
  ) {

    return 0;

  }


  /*
     Normal queue position.
  */

  const position =
    data.queue.indexOf(
      tokenNumber
    );


  if (position !== -1) {

    return position;

  }


  /*
     Fallback calculation if the
     token has moved through the queue.
  */

  if (
    tokenNumber >
    data.current
  ) {

    return Math.max(
      0,
      tokenNumber -
      data.current -
      1
    );

  }


  return 0;

}


/* =========================================================
   14. WAIT CALCULATION
========================================================= */

function calculateWait(
  office,
  tokenNumber
) {

  const data =
    offices[office];


  if (!data) {
    return 0;
  }


  const ahead =
    getPeopleAhead(
      office,
      tokenNumber
    );


  if (
    ahead <= 0
  ) {

    return 0;

  }


  const serviceTime =
    data.serviceTime ||
    2;


  return (
    ahead *
    serviceTime
  );

}


/* =========================================================
   15. PROGRESS
========================================================= */

function calculateProgress(
  current,
  token
) {

  if (
    token <= current
  ) {

    return 100;

  }


  const distance =
    token -
    current;


  return Math.min(
    98,
    Math.max(
      10,
      100 -
      (
        distance *
        10
      )
    )
  );

}


/* =========================================================
   16. UPDATE STUDENT JOURNEY DATA
========================================================= */

function updateJourneyData(
  ahead,
  wait
) {

  setText(
    "journeyPeople",
    ahead
  );


  setText(
    "journeyTime",
    wait
  );


  setText(
    "journeyPagePeople",
    ahead
  );


  setText(
    "journeyPageTime",
    wait
  );


  if (activeToken) {

    setText(
      "journeyToken",
      activeToken.display
    );

  }

}


/* =========================================================
   17. GENERATED TOKEN MODAL
========================================================= */

const closeGenerated =
  document.getElementById(
    "closeGenerated"
  );


if (closeGenerated) {

  closeGenerated.addEventListener(
    "click",
    closeGeneratedModal
  );

}


const doneTokenBtn =
  document.getElementById(
    "doneTokenBtn"
  );


if (doneTokenBtn) {

  doneTokenBtn.addEventListener(
    "click",
    closeGeneratedModal
  );

}


function closeGeneratedModal() {

  if (generatedModal) {

    generatedModal.classList.remove(
      "show"
    );

  }

  document.body.style.overflow =
    "";

}


/* =========================================================
   18. NOTIFICATIONS
========================================================= */

const notifyBtn =
  document.getElementById(
    "notifyBtn"
  );


if (notifyBtn) {

  notifyBtn.addEventListener(
    "click",
    enableNotifications
  );

}


function enableNotifications() {

  if (!activeToken) {

    showToast(
      "No active token",
      "Get a queue token before enabling notifications."
    );

    return;

  }


  notificationsEnabled =
    true;


  if (notifyBtn) {

    notifyBtn.textContent =
      "✓ Notifications Enabled";


    notifyBtn.style.background =
      "#e9f9f1";


    notifyBtn.style.color =
      "#16a36a";

  }


  showToast(
    "Notifications enabled 🔔",
    `CampusFlow will alert you when ${activeToken.display} is called.`
  );

}


function resetNotificationButton() {

  if (!notifyBtn) {
    return;
  }


  notifyBtn.textContent =
    "Notify Me";


  notifyBtn.style.background =
    "";


  notifyBtn.style.color =
    "";

}


/* =========================================================
   19. TOP NOTIFICATION BUTTON
========================================================= */

const notificationBtn =
  document.getElementById(
    "notificationBtn"
  );


if (notificationBtn) {

  notificationBtn.addEventListener(
    "click",
    () => {

      if (!activeToken) {

        showToast(
          "No active token",
          "Get a token to start tracking your queue."
        );

        return;

      }


      const ahead =
        getPeopleAhead(
          activeToken.office,
          activeToken.number
        );


      if (tokenWasCalled) {

        showToast(
          "🔔 Token called",
          `${activeToken.display} please proceed to the counter.`
        );

      } else {

        showToast(
          "Queue status",
          `${activeToken.display} has ${ahead} student${ahead === 1 ? "" : "s"} ahead.`
        );

      }

    }
  );

}


/* =========================================================
   20. VIEW ALL SERVICES
========================================================= */

const viewAllServices =
  document.getElementById(
    "viewAllServices"
  );


if (viewAllServices) {

  viewAllServices.addEventListener(
    "click",
    () => {

      switchSection(
        "services"
      );

    }
  );

}


/* =========================================================
   21. VIEW JOURNEY
========================================================= */

const viewJourneyBtn =
  document.getElementById(
    "viewJourneyBtn"
  );


if (viewJourneyBtn) {

  viewJourneyBtn.addEventListener(
    "click",
    () => {

      switchSection(
        "journey"
      );

      updateSmartJourney();

    }
  );

}


/* =========================================================
   22. JOURNEY TOKEN BUTTON
========================================================= */

const journeyTokenBtn =
  document.getElementById(
    "journeyTokenBtn"
  );


if (journeyTokenBtn) {

  journeyTokenBtn.addEventListener(
    "click",
    () => {

      /*
         If Accounts token already exists,
         take student to live queue.
      */

      if (
        activeToken &&
        activeToken.office ===
        "Accounts"
      ) {

        selectedOfficeDashboard =
          "Accounts";


        showToast(
          "Live queue",
          `${activeToken.display} is being tracked in Accounts.`
        );


        return;

      }


      /*
         Otherwise open Accounts token modal.
      */

      openTokenModal(
        "Accounts"
      );


      /*
         Force Scholarship Renewal
         for Smart Journey.
      */

      const scholarshipOption =
        document.querySelector(
          '.service-option[data-option="Scholarship Renewal"]'
        );


      if (scholarshipOption) {

        serviceOptions.forEach(
          option =>
            option.classList.remove(
              "selected"
            )
        );


        scholarshipOption.classList.add(
          "selected"
        );


        selectedService =
          "Scholarship Renewal";

      }

    }
  );

}


/* =========================================================
   23. SMART INSIGHT
========================================================= */

const insightBtn =
  document.getElementById(
    "insightBtn"
  );


if (insightBtn) {

  insightBtn.addEventListener(
    "click",
    () => {

      const accounts =
        offices["Accounts"];


      const status =
        getCongestionStatus(
          accounts
        );


      showToast(
        "Queue Forecast",
        `Accounts is currently ${status.label.toLowerCase()}. Peak activity is expected around 11:30 AM.`
      );

    }
  );

}


/* =========================================================
   24. SEARCH
========================================================= */

const searchInput =
  document.getElementById(
    "serviceSearch"
  );


if (searchInput) {

  searchInput.addEventListener(
    "input",
    () => {

      const query =
        searchInput.value
          .toLowerCase()
          .trim();


      serviceCards.forEach(
        card => {

          const text =
            card.textContent
              .toLowerCase();


          card.style.display =
            !query ||
            text.includes(query)
              ? ""
              : "none";

        }
      );

    }
  );

}


/* =========================================================
   25. KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    /*
       Ctrl + K
    */

    if (
      (
        event.ctrlKey ||
        event.metaKey
      ) &&
      event.key.toLowerCase() ===
      "k"
    ) {

      event.preventDefault();


      if (searchInput) {

        searchInput.focus();

      }

    }


    /*
       Escape closes modals.
    */

    if (
      event.key ===
      "Escape"
    ) {

      closeTokenModal();

      closeGeneratedModal();

    }

  }
);


/* =========================================================
   26. LIVE CLOCK
========================================================= */

function updateClock() {

  const clock =
    document.getElementById(
      "clock"
    );


  if (!clock) {
    return;
  }


  const now =
    new Date();


  let hours =
    now.getHours();


  const minutes =
    String(
      now.getMinutes()
    ).padStart(
      2,
      "0"
    );


  const period =
    hours >= 12
      ? "PM"
      : "AM";


  hours =
    hours % 12 ||
    12;


  clock.textContent =
    `${hours}:${minutes} ${period}`;

}


updateClock();


/*
   KEEP THIS.

   This is ONLY the clock.

   There is NO queue simulation.
*/

setInterval(
  updateClock,
  1000
);


/* =========================================================
   27. OFFICE DASHBOARD
========================================================= */

function renderOfficeDashboard() {

  const data =
    offices[
      selectedOfficeDashboard
    ];


  if (!data) {
    return;
  }


  /*
     Synchronize waiting count.
  */

  data.waiting =
    data.queue.length;


  /*
     NOW SERVING
  */

  const nowServing =
    data.serving !== null
      ? data.serving
      : data.current;


  setText(
    "officeNowServing",
    data.prefix +
    nowServing
  );


  /*
     WAITING
  */

  setText(
    "officeWaiting",
    data.queue.length
  );


  /*
     AVERAGE SERVICE TIME
  */

  setText(
    "officeAvgService",
    (data.serviceTime || 2) +
    " min"
  );


  /*
     CONGESTION
  */

  const congestion =
    getCongestionStatus(
      data
    );


  setText(
    "officeQueueStatus",
    congestion.label
  );


  /* -------------------------------------------------------
     QUEUE LIST
  ------------------------------------------------------- */

  const queueList =
    document.getElementById(
      "officeQueueList"
    );


  if (queueList) {

    queueList.innerHTML =
      "";


    /*
       SHOW CURRENTLY SERVING TOKEN
    */

    if (
      data.serving !== null
    ) {

      const servingRow =
        document.createElement(
          "div"
        );


      servingRow.className =
        "queue-row";


      const isMyToken =
        activeToken &&
        activeToken.office ===
          selectedOfficeDashboard &&
        activeToken.number ===
          data.serving;


      servingRow.innerHTML = `

        <div class="queue-token queue-serving">
          ${data.prefix}${data.serving}
        </div>

        <div class="queue-info">

          <strong>
            ${isMyToken ? "You" : "Student"}
          </strong>

          <span>
            🔔 Currently Serving
          </span>

        </div>

        <div class="queue-position">
          NOW
        </div>

      `;


      queueList.appendChild(
        servingRow
      );

    }


    /*
       SHOW WAITING QUEUE
    */

    data.queue.forEach(
      (
        token,
        index
      ) => {

        const row =
          document.createElement(
            "div"
          );


        row.className =
          "queue-row";


        const isActiveStudent =
          activeToken &&
          activeToken.office ===
            selectedOfficeDashboard &&
          activeToken.number ===
            token;


        row.innerHTML = `

          <div class="queue-token ${
            isActiveStudent
              ? "queue-serving"
              : ""
          }">

            ${data.prefix}${token}

          </div>


          <div class="queue-info">

            <strong>
              ${
                isActiveStudent
                  ? "You"
                  : "Student"
              }
            </strong>

            <span>
              ${
                index === 0
                  ? "Next in queue"
                  : "Waiting"
              }
            </span>

          </div>


          <div class="queue-position">
            #${index + 1}
          </div>

        `;


        queueList.appendChild(
          row
        );

      }
    );


    /*
       EMPTY QUEUE
    */

    if (
      data.queue.length === 0 &&
      data.serving === null
    ) {

      queueList.innerHTML = `

        <div
          style="
            padding:30px;
            text-align:center;
            color:#697386;
            font-size:10px;
          "
        >

          ✓ Queue is empty

        </div>

      `;

    }

  }


  /*
     COUNTER TOKEN
  */

  setText(
    "counterToken",
    data.serving !== null
      ? data.prefix + data.serving
      : data.prefix + data.current
  );


  /*
     ANALYTICS
  */

  setText(
    "analyticsWaiting",
    data.queue.length
  );


  setText(
    "analyticsEstimate",
    "~" +
    calculateOfficeEstimate(data) +
    " min"
  );


  setText(
    "analyticsServed",
    data.served
  );


  setText(
    "analyticsLoad",
    congestion.percent +
    "%"
  );


  /*
     SMART MESSAGE
  */

  const smartMessage =
    document.getElementById(
      "smartOfficeMessage"
    );


  if (smartMessage) {

    if (
      data.serving !== null
    ) {

      smartMessage.textContent =
        `${data.prefix}${data.serving} is currently being served. Complete the service before calling the next token.`;

    } else if (
      congestion.level ===
      "high"
    ) {

      smartMessage.textContent =
        "Queue congestion is rising. Consider activating another counter to reduce waiting time.";

    } else if (
      congestion.level ===
      "medium"
    ) {

      smartMessage.textContent =
        "Moderate queue detected. Monitor incoming tokens during the next 15 minutes.";

    } else {

      smartMessage.textContent =
        "Queue is moving smoothly. Current staffing appears sufficient.";

    }

  }


  /*
     FORECAST BAR
  */

  const forecastFill =
    document.querySelector(
      ".forecast-fill"
    );


  if (forecastFill) {

    forecastFill.style.width =
      congestion.percent +
      "%";

  }


  /*
     BUTTON STATES
  */

  updateOfficeButtons(
    data
  );


  /*
     Update Smart Journey.
  */

  if (activeJourney) {

    updateSmartJourney();

  }

}


/* =========================================================
   28. OFFICE ESTIMATE
========================================================= */

function calculateOfficeEstimate(
  data
) {

  if (
    data.queue.length === 0
  ) {

    return 0;

  }


  return Math.max(
    1,
    data.queue.length *
    (data.serviceTime || 2)
  );

}


/* =========================================================
   29. CONGESTION
========================================================= */

function getCongestionStatus(
  data
) {

  const waiting =
    data.queue.length;


  if (
    waiting >= 10
  ) {

    return {

      level: "high",

      label: "High Load",

      percent: 90

    };

  }


  if (
    waiting >= 5
  ) {

    return {

      level: "medium",

      label: "Moderate",

      percent: 65

    };

  }


  return {

    level: "low",

    label: "Normal",

    percent: 35

  };

}


/* =========================================================
   30. OFFICE BUTTON STATES
========================================================= */

function updateOfficeButtons(
  data
) {

  /*
     Call Next
  */

  if (callNextBtn) {

    callNextBtn.disabled =
      data.queue.length === 0 ||
      data.serving !== null;

    callNextBtn.style.opacity =
      callNextBtn.disabled
        ? "0.5"
        : "1";

  }


  /*
     Mark Served
  */

  if (markServedBtn) {

    markServedBtn.disabled =
      data.serving === null;

    markServedBtn.style.opacity =
      markServedBtn.disabled
        ? "0.5"
        : "1";

  }


  /*
     Skip
  */

  if (skipBtn) {

    skipBtn.disabled =
      data.queue.length === 0;

    skipBtn.style.opacity =
      skipBtn.disabled
        ? "0.5"
        : "1";

  }

}


/* =========================================================
   31. CALL NEXT TOKEN
========================================================= */

function callNextToken() {

  const data =
    offices[
      selectedOfficeDashboard
    ];


  if (!data) {
    return;
  }


  /*
     Don't call another token while
     current student is being served.
  */

  if (
    data.serving !== null
  ) {

    showToast(
      "Counter busy",
      `${data.prefix}${data.serving} is currently being served.`
    );

    return;

  }


  /*
     No waiting students.
  */

  if (
    data.queue.length === 0
  ) {

    showToast(
      "Queue empty",
      "There are no students waiting."
    );

    return;

  }


  /*
     Take first token from queue.
  */

  const next =
    data.queue.shift();


  data.waiting =
    data.queue.length;


  /*
     Move token into serving state.
  */

  data.serving =
    next;


  data.current =
    next;


  const display =
    data.prefix +
    next;


  /*
     Is this the student's token?
  */

  const isMyToken =
    activeToken &&
    activeToken.office ===
      selectedOfficeDashboard &&
    activeToken.number ===
      next;


  if (isMyToken) {

    tokenWasCalled =
      true;


    updateStudentCalledState();


    showToast(
      "🔔 You're being called!",
      `${display} please proceed to Counter 1.`
    );

  } else {

    showToast(
      "Next token called",
      `${display} please proceed to Counter 1.`
    );

  }


  renderOfficeDashboard();


  updateStudentQueue();

}


function markServed() {
  const data = offices[selectedOfficeDashboard];

  if (!data.serving) {
    showToast("No token is currently being served.");
    return;
  }

  const servedToken = data.serving;

  // Complete the current counter service
  data.served++;
  data.serving = null;
  data.current = servedToken;
  data.waiting = data.queue.length;

  // If this was the student's active token
  if (
    activeToken &&
    activeToken.office === selectedOfficeDashboard &&
    activeToken.number === servedToken
  ) {
    // SCHOLARSHIP RENEWAL JOURNEY
    if (
      activeJourney === "Scholarship Renewal" ||
      activeJourney?.name === "Scholarship Renewal"
    ) {
      if (journeyCurrentStep === 1) {
        // ACCOUNTS COMPLETED
        journeyCurrentStep = 2;

        activeToken = null;
        tokenWasCalled = false;

        selectedOfficeDashboard = "Scholarship";
        officeSelector.value = "Scholarship";

        updateSmartJourney();
        updateSmartJourneyVisuals();
        renderOfficeDashboard();
        updateStudentQueue();

        showToast(
          "Accounts completed ✓ Scholarship Cell is now ready for your next token."
        );

        // Move student to My Journey
        switchSection("journey");

        return;
      }

      if (journeyCurrentStep === 2) {
        // SCHOLARSHIP COMPLETED
        journeyCurrentStep = 3;

        activeToken = null;
        tokenWasCalled = false;

        updateSmartJourney();
        updateSmartJourneyVisuals();
        renderOfficeDashboard();
        updateStudentQueue();

        showToast("Scholarship process completed ✓ Journey finished!");

        switchSection("journey");

        return;
      }
    }

    activeToken = null;
    tokenWasCalled = false;
  }

  renderOfficeDashboard();
  updateStudentQueue();
  updateSmartJourney();
  updateSmartJourneyVisuals();

  showToast(`${data.prefix}${servedToken} marked as served ✓`);
}


/* =========================================================
   33. SKIP TOKEN
========================================================= */

function skipToken() {

  const data =
    offices[
      selectedOfficeDashboard
    ];


  if (!data) {
    return;
  }


  if (
    data.queue.length === 0
  ) {

    showToast(
      "Queue empty",
      "No waiting token to skip."
    );

    return;

  }


  const skipped =
    data.queue.shift();


  data.waiting =
    data.queue.length;


  /*
     If skipped token belongs
     to the student, clear it.
  */

  if (
    activeToken &&
    activeToken.office ===
      selectedOfficeDashboard &&
    activeToken.number ===
      skipped
  ) {

    activeToken =
      null;

    tokenWasCalled =
      false;

    showToast(
      "Token skipped",
      "Your active token was skipped from the queue."
    );

  } else {

    showToast(
      "Token skipped",
      `${data.prefix}${skipped} was removed from the queue.`
    );

  }


  renderOfficeDashboard();


  updateStudentQueue();


  updateServiceCards();

}


/* =========================================================
   34. STUDENT CALLED STATE
========================================================= */

function updateStudentCalledState() {

  if (!activeToken) {
    return;
  }


  /*
     Generated modal office text.
  */

  const label =
    document.getElementById(
      "generatedOffice"
    );


  if (label) {

    label.textContent =
      "🔔 Proceed to Counter 1";

  }


  /*
     Token visual emphasis.
  */

  const token =
    document.getElementById(
      "generatedToken"
    );


  if (token) {

    token.style.transform =
      "scale(1.08)";

    token.style.transition =
      "0.25s ease";

  }


  /*
     Strong notification.
  */

  if (
    notificationsEnabled
  ) {

    showToast(
      "🔔 Notification",
      `${activeToken.display} is now being called.`
    );

  }

}


/* =========================================================
   35. UPDATE STUDENT QUEUE
========================================================= */

function updateStudentQueue() {

  if (!activeToken) {

    updateSmartJourney();

    return;

  }


  const office =
    activeToken.office;


  const data =
    offices[office];


  if (!data) {
    return;
  }


  const number =
    activeToken.number;


  const ahead =
    getPeopleAhead(
      office,
      number
    );


  const wait =
    calculateWait(
      office,
      number
    );


  /*
     Generated token modal.
  */

  if (generatedCurrent) {

    generatedCurrent.textContent =
      data.prefix +
      (
        data.serving !== null
          ? data.serving
          : data.current
      );

  }


  if (generatedAhead) {

    generatedAhead.textContent =
      ahead;

  }


  if (generatedWait) {

    generatedWait.textContent =
      tokenWasCalled
        ? "Now"
        : "~" + wait + " min";

  }


  if (queueProgress) {

    queueProgress.style.width =
      (
        tokenWasCalled
          ? 100
          : calculateProgress(
              data.current,
              number
            )
      ) +
      "%";

  }


  /*
     Journey data.
  */

  updateJourneyData(
    ahead,
    wait
  );


  /*
     Smart Journey.
  */

  updateSmartJourney();

}


/* =========================================================
   36. SMART JOURNEY START
========================================================= */

function startSmartJourney() {

  /*
     If Accounts is already completed
     and Scholarship is next,
     start the Scholarship stage.
  */

  if (
    activeJourney ===
      "Scholarship Renewal" &&
    journeyCurrentStep === 2
  ) {

    openNextJourneyToken();

    return;

  }


  /*
     Start new journey.
  */

  activeJourney =
    "Scholarship Renewal";


  journeyCurrentStep =
    1;


  updateSmartJourney();


  showToast(
    "Smart Journey started ✦",
    "CampusFlow is coordinating your office visits."
  );


  /*
     If there is no token,
     open Accounts modal.
  */

  if (!activeToken) {

    setTimeout(
      () => {

        openTokenModal(
          "Accounts"
        );


        const scholarshipOption =
          document.querySelector(
            '.service-option[data-option="Scholarship Renewal"]'
          );


        if (scholarshipOption) {

          serviceOptions.forEach(
            option =>
              option.classList.remove(
                "selected"
              )
          );


          scholarshipOption.classList.add(
            "selected"
          );


          selectedService =
            "Scholarship Renewal";

        }

      },
      250
    );

  }

}


/* =========================================================
   37. NEXT JOURNEY TOKEN
========================================================= */

function openNextJourneyToken() {

  if (
    activeToken
  ) {

    showToast(
      "Active token",
      `${activeToken.display} is already being tracked.`
    );

    return;

  }


  selectedOffice =
    "Scholarship";


  selectedService =
    "Scholarship Renewal";


  openTokenModal(
    "Scholarship"
  );


  /*
     Keep Scholarship Renewal selected.
  */

  serviceOptions.forEach(
    option =>
      option.classList.remove(
        "selected"
      )
  );


  const scholarshipOption =
    document.querySelector(
      '.service-option[data-option="Scholarship Renewal"]'
    );


  if (scholarshipOption) {

    scholarshipOption.classList.add(
      "selected"
    );

  }

}


/* =========================================================
   38. SMART ETA
========================================================= */

function calculateSmartETA() {

  if (
    activeToken
  ) {

    const wait =
      calculateWait(
        activeToken.office,
        activeToken.number
      );


    if (
      tokenWasCalled
    ) {

      return "NOW";

    }


    const now =
      new Date();


    now.setMinutes(
      now.getMinutes() +
      wait
    );


    return now.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  }


  /*
     No active token.
  */

  if (
    activeJourney ===
      "Scholarship Renewal" &&
    journeyCurrentStep === 2
  ) {

    const scholarship =
      offices["Scholarship"];


    const wait =
      Math.max(
        1,
        scholarship.estimate
      );


    const now =
      new Date();


    now.setMinutes(
      now.getMinutes() +
      wait
    );


    return now.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  }


  const accounts =
    offices["Accounts"];


  const wait =
    Math.max(
      1,
      accounts.estimate
    );


  const now =
    new Date();


  now.setMinutes(
    now.getMinutes() +
    wait
  );


  return now.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


/* =========================================================
   39. UPDATE SMART JOURNEY
========================================================= */

function updateSmartJourney() {

  if (
    !activeJourney
  ) {

    return;

  }


  const panel =
    document.getElementById(
      "smartJourneyPanel"
    );


  /*
     Main journey page.
  */

  updateMainJourney();


  if (!panel) {
    return;
  }


  const steps =
    panel.querySelectorAll(
      ".smart-journey-step"
    );


  if (
    steps.length <
    3
  ) {

    return;

  }


  /*
     STEP 1 — DEPARTMENT
  */

  steps[0].classList.add(
    "completed"
  );

  steps[0].classList.remove(
    "active",
    "upcoming"
  );


  const marker1 =
    steps[0].querySelector(
      ".smart-step-marker"
    );


  if (marker1) {

    marker1.textContent =
      "✓";

  }


  const status1 =
    steps[0].querySelector(
      ".step-status"
    );


  if (status1) {

    status1.textContent =
      "COMPLETED";

  }


  /*
     STEP 2 — ACCOUNTS
  */

  if (
    journeyCurrentStep === 1
  ) {

    steps[1].classList.add(
      "active"
    );

    steps[1].classList.remove(
      "completed",
      "upcoming"
    );


    const marker2 =
      steps[1].querySelector(
        ".smart-step-marker"
      );


    if (marker2) {

      marker2.textContent =
        "2";

    }


    const status2 =
      steps[1].querySelector(
        ".step-status"
      );


    if (status2) {

      status2.textContent =
        activeToken
          ? (
              tokenWasCalled
                ? "CALLED"
                : "ACTIVE"
            )
          : "WAITING";

    }

  }


  if (
    journeyCurrentStep >= 2
  ) {

    steps[1].classList.add(
      "completed"
    );

    steps[1].classList.remove(
      "active",
      "upcoming"
    );


    const marker2 =
      steps[1].querySelector(
        ".smart-step-marker"
      );


    if (marker2) {

      marker2.textContent =
        "✓";

    }


    const status2 =
      steps[1].querySelector(
        ".step-status"
      );


    if (status2) {

      status2.textContent =
        "COMPLETED";

    }

  }


  /*
     STEP 3 — SCHOLARSHIP
  */

  if (
    journeyCurrentStep === 1
  ) {

    steps[2].classList.add(
      "upcoming"
    );

    steps[2].classList.remove(
      "active",
      "completed"
    );


    const status3 =
      steps[2].querySelector(
        ".step-status"
      );


    if (status3) {

      status3.textContent =
        "UPCOMING";

    }

  }


  if (
    journeyCurrentStep === 2
  ) {

    steps[2].classList.add(
      "active"
    );

    steps[2].classList.remove(
      "upcoming",
      "completed"
    );


    const marker3 =
      steps[2].querySelector(
        ".smart-step-marker"
      );


    if (marker3) {

      marker3.textContent =
        "3";

    }


    const status3 =
      steps[2].querySelector(
        ".step-status"
      );


    if (status3) {

      status3.textContent =
        activeToken &&
        activeToken.office ===
          "Scholarship"
          ? "ACTIVE"
          : "NEXT STOP";

    }


    const description3 =
      steps[2].querySelector(
        "p"
      );


    if (description3) {

      description3.textContent =
        activeToken
          ? "Your Scholarship Cell queue is now active."
          : "Accounts completed. Your next queue is now unlocked.";

    }

  }


  /*
     STEP 3 COMPLETED
  */

  if (
    journeyCurrentStep >= 3
  ) {

    steps[2].classList.add(
      "completed"
    );

    steps[2].classList.remove(
      "active",
      "upcoming"
    );


    const marker3 =
      steps[2].querySelector(
        ".smart-step-marker"
      );


    if (marker3) {

      marker3.textContent =
        "✓";

    }


    const status3 =
      steps[2].querySelector(
        ".step-status"
      );


    if (status3) {

      status3.textContent =
        "COMPLETED";

    }


    const description3 =
      steps[2].querySelector(
        "p"
      );


    if (description3) {

      description3.textContent =
        "Scholarship processing completed successfully.";

    }

  }


  /*
     Accounts information card.
  */

  const accounts =
    offices["Accounts"];


  if (
    journeyCurrentStep === 1
  ) {

    const tokenText =
      activeToken &&
      activeToken.office ===
        "Accounts"
        ? activeToken.display
        : `A-${accounts.nextToken}`;


    const ahead =
      activeToken &&
      activeToken.office ===
        "Accounts"
        ? getPeopleAhead(
            "Accounts",
            activeToken.number
          )
        : accounts.queue.length;


    const wait =
      activeToken &&
      activeToken.office ===
        "Accounts"
        ? calculateWait(
            "Accounts",
            activeToken.number
          )
        : accounts.estimate;


    setText(
      "journeyAccountsInfo",
      `Token ${tokenText} · ${ahead} people ahead · ~${wait} min`
    );


    setText(
      "journeyAccountsETA",
      calculateSmartETA()
    );

  }


  /*
     Accounts completed.
  */

  if (
    journeyCurrentStep >= 2
  ) {

    setText(
      "journeyAccountsInfo",
      "✓ Accounts verification completed"
    );


    setText(
      "journeyAccountsETA",
      "Completed"
    );

  }


  /*
     Recommendation.
  */

  const recommendation =
    document.getElementById(
      "journeyRecommendation"
    );


  if (recommendation) {

    if (
      journeyCurrentStep >= 3
    ) {

      recommendation.textContent =
        "Your complete service journey is finished. CampusFlow has successfully coordinated all required offices.";

    } else if (
      journeyCurrentStep === 2
    ) {

      if (
        activeToken &&
        activeToken.office ===
          "Scholarship"
      ) {

        const ahead =
          getPeopleAhead(
            "Scholarship",
            activeToken.number
          );


        recommendation.textContent =
          `Scholarship Cell is active. You have ${ahead} student${ahead === 1 ? "" : "s"} ahead.`;

      } else {

        recommendation.textContent =
          "Accounts verification is complete. Scholarship Cell is now unlocked as your next stop.";

      }

    } else {

      const ahead =
        activeToken &&
        activeToken.office ===
          "Accounts"
          ? getPeopleAhead(
              "Accounts",
              activeToken.number
            )
          : accounts.queue.length;


      if (
        ahead <= 2
      ) {

        recommendation.textContent =
          "Your Accounts queue is almost ready. Stay nearby and prepare your documents.";

      } else {

        recommendation.textContent =
          "You don't need to wait at Scholarship Cell yet. Complete Accounts first and CampusFlow will unlock your next stop.";

      }

    }

  }


  /*
     Journey button.
  */

  updateJourneyButton();

}


/* =========================================================
   40. MAIN JOURNEY PAGE
========================================================= */

function updateMainJourney() {

  /*
     Progress values:

     Step 1 = 2 of 3
     Step 2 = 2 of 3
     Step 3 = 3 of 3

     Department is already completed.
  */

  let completedServices = 2;


  if (
    journeyCurrentStep >= 3
  ) {

    completedServices = 3;

  }


  setText(
    "journeyProgressCount",
    `${completedServices} of 3 services`
  );


  setText(
    "journeyProgressPercent",
    Math.round(
      (
        completedServices /
        3
      ) *
      100
    ) +
    "%"
  );


  /*
     These IDs may not exist in the current
     HTML, so this is safe.
  */

  const progressBar =
    document.querySelector(
      ".journey-progress-fill"
    );


  if (progressBar) {

    progressBar.style.width =
      (
        completedServices /
        3 *
        100
      ) +
      "%";

  }

}


/* =========================================================
   41. JOURNEY BUTTON
========================================================= */

function updateJourneyButton() {

  const button =
    document.getElementById(
      "startJourneyBtn"
    );


  if (!button) {
    return;
  }


  /*
     Journey not started.
  */

  if (!activeJourney) {

    button.disabled =
      false;

    button.style.opacity =
      "1";

    button.style.cursor =
      "pointer";

    button.innerHTML =
      "Start Smart Journey <span>→</span>";

    return;

  }


  /*
     Accounts stage.
  */

  if (
    journeyCurrentStep === 1
  ) {

    if (
      activeToken
    ) {

      button.disabled =
        true;

      button.style.opacity =
        "0.75";

      button.style.cursor =
        "default";

      button.innerHTML =
        "Journey Active <span>✓</span>";

    } else {

      button.disabled =
        false;

      button.style.opacity =
        "1";

      button.style.cursor =
        "pointer";

      button.innerHTML =
        "Get Accounts Token <span>→</span>";

    }

    return;

  }


  /*
     Scholarship stage.
  */

  if (
    journeyCurrentStep === 2
  ) {

    if (
      activeToken
    ) {

      button.disabled =
        true;

      button.style.opacity =
        "0.75";

      button.innerHTML =
        "Scholarship Queue Active <span>✓</span>";

    } else {

      button.disabled =
        false;

      button.style.opacity =
        "1";

      button.style.cursor =
        "pointer";

      button.innerHTML =
        "Get Scholarship Token <span>→</span>";

    }

    return;

  }


  /*
     Completed.
  */

  if (
    journeyCurrentStep >= 3
  ) {

    button.disabled =
      true;

    button.style.opacity =
      "0.75";

    button.style.cursor =
      "default";

    button.innerHTML =
      "Journey Completed ✓";

  }

}


/* =========================================================
   42. HANDLE JOURNEY STEP COMPLETION
========================================================= */

function handleJourneyStepCompleted() {

  /*
     ACCOUNTS → SCHOLARSHIP
  */

  if (
    activeJourney ===
      "Scholarship Renewal" &&
    activeToken &&
    activeToken.office ===
      "Accounts"
  ) {

    /*
       Clear completed token.
    */

    activeToken =
      null;


    tokenWasCalled =
      false;


    notificationsEnabled =
      false;


    resetNotificationButton();


    /*
       Advance journey.
    */

    journeyCurrentStep =
      2;


    updateSmartJourney();


    showToast(
      "Next stop unlocked ✦",
      "Accounts completed. Scholarship Cell is now ready."
    );


    /*
       Show Journey page.
    */

    setTimeout(
      () => {

        switchSection(
          "journey"
        );

      },
      450
    );


    return;

  }


  /*
     SCHOLARSHIP → COMPLETED
  */

  if (
    activeJourney ===
      "Scholarship Renewal" &&
    activeToken &&
    activeToken.office ===
      "Scholarship"
  ) {

    activeToken =
      null;


    tokenWasCalled =
      false;


    notificationsEnabled =
      false;


    resetNotificationButton();


    journeyCurrentStep =
      3;


    updateSmartJourney();


    showToast(
      "Journey completed 🎉",
      "Scholarship Renewal has been completed successfully."
    );


    setTimeout(
      () => {

        switchSection(
          "journey"
        );

      },
      450
    );


    return;

  }


  /*
     Normal service.
  */

  activeToken =
    null;


  tokenWasCalled =
    false;


  notificationsEnabled =
    false;


  resetNotificationButton();

}


/* =========================================================
   43. START JOURNEY BUTTON
========================================================= */

const startJourneyBtn =
  document.getElementById(
    "startJourneyBtn"
  );


if (startJourneyBtn) {

  startJourneyBtn.addEventListener(
    "click",
    startSmartJourney
  );

}


/* =========================================================
   44. TOAST
========================================================= */

let toastTimer;


function showToast(
  title,
  message
) {

  if (!toast) {
    return;
  }


  /*
     Support one-argument calls.
  */

  if (
    message === undefined
  ) {

    message =
      title;

    title =
      "CampusFlow";

  }


  if (toastTitle) {

    toastTitle.textContent =
      title;

  }


  if (toastMessage) {

    toastMessage.textContent =
      message;

  }


  toast.classList.add(
    "show"
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      4000
    );

}


/* =========================================================
   45. MODAL BACKDROP
========================================================= */

if (tokenModal) {

  tokenModal.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        tokenModal
      ) {

        closeTokenModal();

      }

    }
  );

}


if (generatedModal) {

  generatedModal.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        generatedModal
      ) {

        closeGeneratedModal();

      }

    }
  );

}


/* =========================================================
   46. OFFICE SELECTOR
========================================================= */

if (officeSelector) {

  officeSelector.addEventListener(
    "change",
    event => {

      selectedOfficeDashboard =
        event.target.value;


      renderOfficeDashboard();


      if (
        offices[
          selectedOfficeDashboard
        ]
      ) {

        showToast(
          "Office changed",
          `Now monitoring ${offices[selectedOfficeDashboard].name}.`
        );

      }

    }
  );

}


/* =========================================================
   47. OFFICE BUTTONS
========================================================= */

const callNextBtn =
  document.getElementById(
    "callNextBtn"
  );


if (callNextBtn) {

  callNextBtn.addEventListener(
    "click",
    callNextToken
  );

}


const markServedBtn =
  document.getElementById(
    "markServedBtn"
  );


if (markServedBtn) {

  markServedBtn.addEventListener(
    "click",
    markServed
  );

}


const skipBtn =
  document.getElementById(
    "skipBtn"
  );


if (skipBtn) {

  skipBtn.addEventListener(
    "click",
    skipToken
  );

}


/* =========================================================
   48. UPDATE SERVICE CARDS
========================================================= */

function updateServiceCards() {

  serviceCards.forEach(
    card => {

      const service =
        card.dataset.service;


      /*
         Scholarship Renewal card
         is a journey, not a direct
         office queue.
      */

      if (
        service ===
        "Scholarship Renewal"
      ) {

        return;

      }


      const data =
        offices[service];


      if (!data) {
        return;
      }


      /*
         Update common metadata.
      */

      const meta =
        card.querySelector(
          ".service-meta"
        );


      if (meta) {

        const spans =
          meta.querySelectorAll(
            "span"
          );


        if (
          spans[0]
        ) {

          spans[0].textContent =
            data.queue.length +
            " waiting";

        }


        if (
          spans[1]
        ) {

          spans[1].textContent =
            "~" +
            data.estimate +
            " min";

        }

      }


      /*
         Large service cards.
      */

      const bottom =
        card.querySelector(
          ".large-card-bottom"
        );


      if (bottom) {

        const strong =
          bottom.querySelector(
            "strong"
          );


        if (strong) {

          strong.textContent =
            data.queue.length +
            " students waiting";

        }

      }

    }
  );

}


/* =========================================================
   49. INITIALIZATION
========================================================= */

if (officeSelector) {

  officeSelector.value =
    selectedOfficeDashboard;

}


renderOfficeDashboard();

updateServiceCards();


/*
   Do NOT call updateSmartJourney()
   here because the journey has not
   been started yet.
*/


console.log(
  "%cCampusFlow V4 initialized 🚀",
  "font-size:18px;font-weight:bold;"
);


console.log(
  "Smart Queue & Office Management"
);


console.log(
  "Student → Queue → Office → Call → Serve → Journey"
);


console.log(
  "Auto queue simulation: DISABLED"
);