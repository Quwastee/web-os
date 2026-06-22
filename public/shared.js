/* =========================================================
   Safari Office — shared theme & i18n module
   Used by login.html, dashboard.html, user.html
   ========================================================= */

const SAFARI_THEMES = ["dark", "light", "gray"];

const SAFARI_I18N = {
  en: {
    signInSubtitle: "Sign in to continue",
    username: "Username",
    password: "Password",
    signIn: "Sign In",
    wrongCredentials: "Wrong credentials",
    globalChat: "Global Chat",
    lunchBreakChat: "Lunch + Break",
    chatComingSoon: "This chat is read-only for now — messaging will be enabled soon.",
    teamChat: "Team Chat",
    crm: "CRM",
    myProfile: "My Profile",
    logout: "Logout",
    writeMessage: "Write message...",
    noTeam: "No team",
    noTeamAssigned: "You have no team assigned.",
    systemOnline: "System online",
    activeRoom: "Active room",
    openProfilePage: "Open my profile page",
    changePhoto: "Change photo",
    uploadFailed: "Upload failed",
    loadingUser: "Loading user...",
    loading: "Loading...",
    failedToLoad: "Failed to load data.",
    online: "Online",
    team: "Team",
    role: "Role",
    goToDashboard: "Go to dashboard",
    teamChatTitle: "Team Chat",
    tickets: "Tickets",
    createTicket: "Create Ticket",
    ticketType: "Problem type",
    ticketDescription: "Description",
    ticketDescPlaceholder: "Describe the problem in detail…",
    ticketAssignee: "Assign to (your team)",
    ticketAttachments: "Attachments (optional)",
    searchTeamMember: "Search team member...",
    clickToAttach: "Click to attach files (png, jpg, webp, pdf, docx — max 20MB each)",
    cancel: "Cancel",
    submitTicket: "Submit Ticket",
    ticketCreatedSuccess: "Ticket created successfully",
    filterAllStatuses: "All statuses",
    filterAllTypes: "All types",
    statusOpen: "Open",
    statusInProgress: "In Progress",
    statusResolved: "Resolved",
    statusClosed: "Closed",
    noTicketsFound: "No tickets found.",
    ticketCreatedBy: "Created by",
    ticketAssignedTo: "Assigned to",
    ticketCreatedAt: "Created",
    changeStatus: "Change status",
    selectTypeError: "Please select a problem type",
    descTooShortError: "Description must be at least 10 characters",
    selectAssigneeError: "Please select someone to assign this ticket to",
    noTeamForTickets: "You need a team to create tickets.",
    close: "Close",
    globalChatShort: "Global",
    teamChatShort: "Team",
    chatsShort: "Chats",
    ticketsShort: "Tickets",
    profileShort: "Profile",
    dmSearchPlaceholder: "Search people...",
    dmSelectPrompt: "Select a conversation or search for someone to start chatting.",
    dmStartNew: "Start a new chat",
    dmPersonalSection: "Direct messages",
    dmNoResults: "No people found.",
    dmNoMessagesYet: "No messages yet",
    dmAttachment: "Attachment",
    msgMoreOptions: "More options",
    msgDeleteOwn: "Delete message",
    msgDeleteAdmin: "Delete message (admin)",
    msgDeleteConfirm: "Delete this message?",
    startChat: "Message",
    crmSubtitleOrg: "Organization chart",
    crmSubtitleMyTeam: "Your team structure",
    crmSearchPlaceholder: "Search agents, leads…",
    crmLegendSales: "Sales",
    crmLegendRetention: "Retention",
    crmHeadOfSales: "Head of Sales",
    crmTeamLead: "Team Lead",
    crmViewTree: "Tree",
    crmViewList: "List",
    crmNoAgents: "No agents assigned",
    crmNoLeads: "No team leads",
    crmUnassigned: "Unassigned",
    crmNoData: "No team data to show yet.",
    crmFound: "found",
    crmViewProfile: "View profile",
    tabOverview: "Overview",
    tabAgentData: "Agent Data",
    agentDataIntro: "Mail and Zoho credentials used for this agent.",
    agentDataAdminOnly: "Only an administrator can edit this information.",
    gmailAddress: "Gmail Address",
    department: "Department",
    manager: "Manager",
    zohoBrandSoltren: "Zoho Mail — Soltrenpertners",
    zohoBrandIsp: "Zoho Mail — ISP Holdings",
    zohoMail: "Zoho Mail",
    zohoPassword: "Zoho Password",
    notSet: "Not set",
    show: "Show",
    hide: "Hide",
    copy: "Copy",
    copied: "Copied",
    saveChanges: "Save changes",
    savedSuccess: "Saved successfully",
    saveFailed: "Failed to save",
    editAgentData: "Edit",
    cancelEdit: "Cancel",
    noAccessAgentData: "You don't have access to this information."
  },
  ru: {
    signInSubtitle: "Войдите в систему",
    username: "Логин",
    password: "Пароль",
    signIn: "Войти",
    wrongCredentials: "Неверные данные",
    globalChat: "Общий чат",
    lunchBreakChat: "Lunch + Break",
    chatComingSoon: "Этот чат пока доступен только для просмотра — отправка сообщений будет добавлена позже.",
    teamChat: "Чат команды",
    crm: "CRM",
    myProfile: "Мой профиль",
    logout: "Выйти",
    writeMessage: "Написать сообщение...",
    noTeam: "Нет команды",
    noTeamAssigned: "У вас не назначена команда.",
    systemOnline: "Система онлайн",
    activeRoom: "Активная комната",
    openProfilePage: "Открыть страницу профиля",
    changePhoto: "Изменить фото",
    uploadFailed: "Загрузка не удалась",
    loadingUser: "Загрузка пользователя...",
    loading: "Загрузка...",
    failedToLoad: "Не удалось загрузить данные.",
    online: "Онлайн",
    team: "Команда",
    role: "Роль",
    goToDashboard: "Перейти в дашборд",
    teamChatTitle: "Чат команды",
    tickets: "Тикеты",
    createTicket: "Создать тикет",
    ticketType: "Тип проблемы",
    ticketDescription: "Описание",
    ticketDescPlaceholder: "Опишите проблему подробно…",
    ticketAssignee: "Назначить (ваша команда)",
    ticketAttachments: "Вложения (необязательно)",
    searchTeamMember: "Поиск участника команды...",
    clickToAttach: "Нажмите, чтобы прикрепить файлы (png, jpg, webp, pdf, docx — до 20МБ каждый)",
    cancel: "Отмена",
    submitTicket: "Отправить тикет",
    ticketCreatedSuccess: "Тикет успешно создан",
    filterAllStatuses: "Все статусы",
    filterAllTypes: "Все типы",
    statusOpen: "Открыт",
    statusInProgress: "В работе",
    statusResolved: "Решено",
    statusClosed: "Закрыто",
    noTicketsFound: "Тикеты не найдены.",
    ticketCreatedBy: "Создал",
    ticketAssignedTo: "Назначено",
    ticketCreatedAt: "Создан",
    changeStatus: "Изменить статус",
    selectTypeError: "Выберите тип проблемы",
    descTooShortError: "Описание должно содержать минимум 10 символов",
    selectAssigneeError: "Выберите, кому назначить тикет",
    noTeamForTickets: "Для создания тикетов нужна команда.",
    close: "Закрыть",
    globalChatShort: "Общий",
    teamChatShort: "Команда",
    chatsShort: "Чаты",
    ticketsShort: "Тикеты",
    profileShort: "Профиль",
    dmSearchPlaceholder: "Поиск людей...",
    dmSelectPrompt: "Выберите чат или найдите человека, чтобы начать переписку.",
    dmStartNew: "Начать новый чат",
    dmPersonalSection: "Личные сообщения",
    dmNoResults: "Люди не найдены.",
    dmNoMessagesYet: "Пока нет сообщений",
    dmAttachment: "Вложение",
    msgMoreOptions: "Ещё",
    msgDeleteOwn: "Удалить сообщение",
    msgDeleteAdmin: "Удалить сообщение (админ)",
    msgDeleteConfirm: "Удалить это сообщение?",
    startChat: "Написать",
    crmSubtitleOrg: "Организационная структура",
    crmSubtitleMyTeam: "Структура вашей команды",
    crmSearchPlaceholder: "Поиск агентов, тимлидов…",
    crmLegendSales: "Продажи",
    crmLegendRetention: "Ретеншн",
    crmHeadOfSales: "Head of Sales",
    crmTeamLead: "Тимлид",
    crmViewTree: "Дерево",
    crmViewList: "Список",
    crmNoAgents: "Нет назначенных агентов",
    crmNoLeads: "Нет тимлидов",
    crmUnassigned: "Без команды",
    crmNoData: "Пока нет данных о командах.",
    crmFound: "найдено",
    crmViewProfile: "Открыть профиль",
    tabOverview: "Обзор",
    tabAgentData: "Данные для агента",
    agentDataIntro: "Почта и данные Zoho, используемые этим агентом.",
    agentDataAdminOnly: "Редактировать эту информацию может только администратор.",
    gmailAddress: "Gmail адрес",
    department: "Отдел",
    manager: "Руководитель",
    zohoBrandSoltren: "Zoho Mail — Soltrenpertners",
    zohoBrandIsp: "Zoho Mail — ISP Holdings",
    zohoMail: "Zoho Mail",
    zohoPassword: "Пароль Zoho",
    notSet: "Не указано",
    show: "Показать",
    hide: "Скрыть",
    copy: "Копировать",
    copied: "Скопировано",
    saveChanges: "Сохранить изменения",
    savedSuccess: "Успешно сохранено",
    saveFailed: "Не удалось сохранить",
    editAgentData: "Редактировать",
    cancelEdit: "Отмена",
    noAccessAgentData: "У вас нет доступа к этой информации."
  },
  ua: {
    signInSubtitle: "Увійдіть у систему",
    username: "Логін",
    password: "Пароль",
    signIn: "Увійти",
    wrongCredentials: "Невірні дані",
    globalChat: "Загальний чат",
    lunchBreakChat: "Lunch + Break",
    chatComingSoon: "Цей чат поки доступний лише для перегляду — надсилання повідомлень додамо пізніше.",
    teamChat: "Чат команди",
    crm: "CRM",
    myProfile: "Мій профіль",
    logout: "Вийти",
    writeMessage: "Написати повідомлення...",
    noTeam: "Немає команди",
    noTeamAssigned: "У вас немає призначеної команди.",
    systemOnline: "Система онлайн",
    activeRoom: "Активна кімната",
    openProfilePage: "Відкрити сторінку профілю",
    changePhoto: "Змінити фото",
    uploadFailed: "Завантаження не вдалося",
    loadingUser: "Завантаження користувача...",
    loading: "Завантаження...",
    failedToLoad: "Не вдалося завантажити дані.",
    online: "Онлайн",
    team: "Команда",
    role: "Роль",
    goToDashboard: "Перейти до дашборду",
    teamChatTitle: "Чат команди",
    tickets: "Тікети",
    createTicket: "Створити тікет",
    ticketType: "Тип проблеми",
    ticketDescription: "Опис",
    ticketDescPlaceholder: "Опишіть проблему детально…",
    ticketAssignee: "Призначити (ваша команда)",
    ticketAttachments: "Вкладення (необов'язково)",
    searchTeamMember: "Пошук учасника команди...",
    clickToAttach: "Натисніть, щоб додати файли (png, jpg, webp, pdf, docx — до 20МБ кожен)",
    cancel: "Скасувати",
    submitTicket: "Надіслати тікет",
    ticketCreatedSuccess: "Тікет успішно створено",
    filterAllStatuses: "Усі статуси",
    filterAllTypes: "Усі типи",
    statusOpen: "Відкрито",
    statusInProgress: "У роботі",
    statusResolved: "Вирішено",
    statusClosed: "Закрито",
    noTicketsFound: "Тікетів не знайдено.",
    ticketCreatedBy: "Створив",
    ticketAssignedTo: "Призначено",
    ticketCreatedAt: "Створено",
    changeStatus: "Змінити статус",
    selectTypeError: "Виберіть тип проблеми",
    descTooShortError: "Опис має містити щонайменше 10 символів",
    selectAssigneeError: "Виберіть, кому призначити тікет",
    noTeamForTickets: "Для створення тікетів потрібна команда.",
    close: "Закрити",
    globalChatShort: "Загальний",
    teamChatShort: "Команда",
    chatsShort: "Чати",
    ticketsShort: "Тікети",
    profileShort: "Профіль",
    dmSearchPlaceholder: "Пошук людей...",
    dmSelectPrompt: "Виберіть чат або знайдіть людину, щоб почати спілкування.",
    dmStartNew: "Почати новий чат",
    dmPersonalSection: "Особисті повідомлення",
    dmNoResults: "Людей не знайдено.",
    dmNoMessagesYet: "Повідомлень ще немає",
    dmAttachment: "Вкладення",
    msgMoreOptions: "Ще",
    msgDeleteOwn: "Видалити повідомлення",
    msgDeleteAdmin: "Видалити повідомлення (адмін)",
    msgDeleteConfirm: "Видалити це повідомлення?",
    startChat: "Написати",
    crmSubtitleOrg: "Організаційна структура",
    crmSubtitleMyTeam: "Структура вашої команди",
    crmSearchPlaceholder: "Пошук агентів, тімлідів…",
    crmLegendSales: "Продажі",
    crmLegendRetention: "Ретеншн",
    crmHeadOfSales: "Head of Sales",
    crmTeamLead: "Тімлід",
    crmViewTree: "Дерево",
    crmViewList: "Список",
    crmNoAgents: "Немає призначених агентів",
    crmNoLeads: "Немає тімлідів",
    crmUnassigned: "Без команди",
    crmNoData: "Поки немає даних про команди.",
    crmFound: "знайдено",
    crmViewProfile: "Відкрити профіль",
    tabOverview: "Огляд",
    tabAgentData: "Дані для агента",
    agentDataIntro: "Пошта та дані Zoho, що використовуються цим агентом.",
    agentDataAdminOnly: "Редагувати цю інформацію може лише адміністратор.",
    gmailAddress: "Gmail адреса",
    department: "Відділ",
    manager: "Керівник",
    zohoBrandSoltren: "Zoho Mail — Soltrenpertners",
    zohoBrandIsp: "Zoho Mail — ISP Holdings",
    zohoMail: "Zoho Mail",
    zohoPassword: "Пароль Zoho",
    notSet: "Не вказано",
    show: "Показати",
    hide: "Сховати",
    copy: "Копіювати",
    copied: "Скопійовано",
    saveChanges: "Зберегти зміни",
    savedSuccess: "Успішно збережено",
    saveFailed: "Не вдалося зберегти",
    editAgentData: "Редагувати",
    cancelEdit: "Відмінити",
    noAccessAgentData: "У вас немає доступу до цієї інформації."
  },
  fr: {
    signInSubtitle: "Connexion au système",
    username: "Nom d'utilisateur",
    password: "Mot de passe",
    signIn: "Se connecter",
    wrongCredentials: "Identifiants incorrects",
    globalChat: "Chat global",
    lunchBreakChat: "Lunch + Break",
    chatComingSoon: "Ce chat est en lecture seule pour l'instant — l'envoi de messages sera bientôt activé.",
    teamChat: "Chat d'équipe",
    crm: "CRM",
    myProfile: "Mon profil",
    logout: "Déconnexion",
    writeMessage: "Écrire un message...",
    noTeam: "Aucune équipe",
    noTeamAssigned: "Vous n'avez pas d'équipe assignée.",
    systemOnline: "Système en ligne",
    activeRoom: "Salle active",
    openProfilePage: "Ouvrir ma page de profil",
    changePhoto: "Changer la photo",
    uploadFailed: "Échec du téléchargement",
    loadingUser: "Chargement de l'utilisateur...",
    loading: "Chargement...",
    failedToLoad: "Échec du chargement des données.",
    online: "En ligne",
    team: "Équipe",
    role: "Rôle",
    goToDashboard: "Aller au tableau de bord",
    teamChatTitle: "Chat d'équipe",
    tickets: "Tickets",
    createTicket: "Créer un ticket",
    ticketType: "Type de problème",
    ticketDescription: "Description",
    ticketDescPlaceholder: "Décrivez le problème en détail…",
    ticketAssignee: "Assigner à (votre équipe)",
    ticketAttachments: "Pièces jointes (facultatif)",
    searchTeamMember: "Rechercher un membre de l'équipe...",
    clickToAttach: "Cliquez pour joindre des fichiers (png, jpg, webp, pdf, docx — max 20 Mo chacun)",
    cancel: "Annuler",
    submitTicket: "Envoyer le ticket",
    ticketCreatedSuccess: "Ticket créé avec succès",
    filterAllStatuses: "Tous les statuts",
    filterAllTypes: "Tous les types",
    statusOpen: "Ouvert",
    statusInProgress: "En cours",
    statusResolved: "Résolu",
    statusClosed: "Fermé",
    noTicketsFound: "Aucun ticket trouvé.",
    ticketCreatedBy: "Créé par",
    ticketAssignedTo: "Assigné à",
    ticketCreatedAt: "Créé le",
    changeStatus: "Changer le statut",
    selectTypeError: "Veuillez sélectionner un type de problème",
    descTooShortError: "La description doit contenir au moins 10 caractères",
    selectAssigneeError: "Veuillez choisir à qui assigner ce ticket",
    noTeamForTickets: "Vous devez appartenir à une équipe pour créer des tickets.",
    close: "Fermer",
    globalChatShort: "Global",
    teamChatShort: "Équipe",
    chatsShort: "Messages",
    ticketsShort: "Tickets",
    profileShort: "Profil",
    dmSearchPlaceholder: "Rechercher des personnes...",
    dmSelectPrompt: "Sélectionnez une conversation ou recherchez quelqu'un pour commencer à discuter.",
    dmStartNew: "Démarrer une nouvelle discussion",
    dmPersonalSection: "Messages privés",
    dmNoResults: "Aucune personne trouvée.",
    dmNoMessagesYet: "Aucun message pour le moment",
    dmAttachment: "Pièce jointe",
    msgMoreOptions: "Plus d'options",
    msgDeleteOwn: "Supprimer le message",
    msgDeleteAdmin: "Supprimer le message (admin)",
    msgDeleteConfirm: "Supprimer ce message ?",
    startChat: "Message",
    crmSubtitleOrg: "Organigramme",
    crmSubtitleMyTeam: "Structure de votre équipe",
    crmSearchPlaceholder: "Rechercher agents, responsables…",
    crmLegendSales: "Ventes",
    crmLegendRetention: "Rétention",
    crmHeadOfSales: "Head of Sales",
    crmTeamLead: "Chef d'équipe",
    crmViewTree: "Arbre",
    crmViewList: "Liste",
    crmNoAgents: "Aucun agent assigné",
    crmNoLeads: "Aucun chef d'équipe",
    crmUnassigned: "Non assigné",
    crmNoData: "Aucune donnée d'équipe à afficher pour le moment.",
    crmFound: "trouvé(s)",
    crmViewProfile: "Voir le profil",
    tabOverview: "Aperçu",
    tabAgentData: "Données de l'agent",
    agentDataIntro: "Identifiants de messagerie et Zoho utilisés par cet agent.",
    agentDataAdminOnly: "Seul un administrateur peut modifier ces informations.",
    gmailAddress: "Adresse Gmail",
    department: "Département",
    manager: "Manager",
    zohoBrandSoltren: "Zoho Mail — Soltrenpertners",
    zohoBrandIsp: "Zoho Mail — ISP Holdings",
    zohoMail: "Zoho Mail",
    zohoPassword: "Mot de passe Zoho",
    notSet: "Non défini",
    show: "Afficher",
    hide: "Masquer",
    copy: "Copier",
    copied: "Copié",
    saveChanges: "Enregistrer",
    savedSuccess: "Enregistré avec succès",
    saveFailed: "Échec de l'enregistrement",
    editAgentData: "Modifier",
    cancelEdit: "Annuler",
    noAccessAgentData: "Vous n'avez pas accès à ces informations."
  },
  es: {
    signInSubtitle: "Iniciar sesión",
    username: "Usuario",
    password: "Contraseña",
    signIn: "Entrar",
    wrongCredentials: "Credenciales incorrectas",
    globalChat: "Chat global",
    lunchBreakChat: "Lunch + Break",
    chatComingSoon: "Este chat es solo de lectura por ahora — el envío de mensajes se habilitará próximamente.",
    teamChat: "Chat de equipo",
    crm: "CRM",
    myProfile: "Mi perfil",
    logout: "Cerrar sesión",
    writeMessage: "Escribe un mensaje...",
    noTeam: "Sin equipo",
    noTeamAssigned: "No tienes un equipo asignado.",
    systemOnline: "Sistema en línea",
    activeRoom: "Sala activa",
    openProfilePage: "Abrir mi página de perfil",
    changePhoto: "Cambiar foto",
    uploadFailed: "Error al subir",
    loadingUser: "Cargando usuario...",
    loading: "Cargando...",
    failedToLoad: "No se pudieron cargar los datos.",
    online: "En línea",
    team: "Equipo",
    role: "Rol",
    goToDashboard: "Ir al panel",
    teamChatTitle: "Chat de equipo",
    tickets: "Tickets",
    createTicket: "Crear ticket",
    ticketType: "Tipo de problema",
    ticketDescription: "Descripción",
    ticketDescPlaceholder: "Describe el problema en detalle…",
    ticketAssignee: "Asignar a (tu equipo)",
    ticketAttachments: "Archivos adjuntos (opcional)",
    searchTeamMember: "Buscar miembro del equipo...",
    clickToAttach: "Haz clic para adjuntar archivos (png, jpg, webp, pdf, docx — máx. 20MB cada uno)",
    cancel: "Cancelar",
    submitTicket: "Enviar ticket",
    ticketCreatedSuccess: "Ticket creado con éxito",
    filterAllStatuses: "Todos los estados",
    filterAllTypes: "Todos los tipos",
    statusOpen: "Abierto",
    statusInProgress: "En progreso",
    statusResolved: "Resuelto",
    statusClosed: "Cerrado",
    noTicketsFound: "No se encontraron tickets.",
    ticketCreatedBy: "Creado por",
    ticketAssignedTo: "Asignado a",
    ticketCreatedAt: "Creado",
    changeStatus: "Cambiar estado",
    selectTypeError: "Selecciona un tipo de problema",
    descTooShortError: "La descripción debe tener al menos 10 caracteres",
    selectAssigneeError: "Elige a quién asignar este ticket",
    noTeamForTickets: "Necesitas un equipo para crear tickets.",
    close: "Cerrar",
    globalChatShort: "Global",
    teamChatShort: "Equipo",
    chatsShort: "Chats",
    ticketsShort: "Tickets",
    profileShort: "Perfil",
    dmSearchPlaceholder: "Buscar personas...",
    dmSelectPrompt: "Selecciona una conversación o busca a alguien para empezar a chatear.",
    dmStartNew: "Iniciar nuevo chat",
    dmPersonalSection: "Mensajes directos",
    dmNoResults: "No se encontraron personas.",
    dmNoMessagesYet: "Aún no hay mensajes",
    dmAttachment: "Adjunto",
    msgMoreOptions: "Más opciones",
    msgDeleteOwn: "Eliminar mensaje",
    msgDeleteAdmin: "Eliminar mensaje (admin)",
    msgDeleteConfirm: "¿Eliminar este mensaje?",
    startChat: "Mensaje",
    crmSubtitleOrg: "Organigrama",
    crmSubtitleMyTeam: "Estructura de tu equipo",
    crmSearchPlaceholder: "Buscar agentes, líderes…",
    crmLegendSales: "Ventas",
    crmLegendRetention: "Retención",
    crmHeadOfSales: "Head of Sales",
    crmTeamLead: "Líder de equipo",
    crmViewTree: "Árbol",
    crmViewList: "Lista",
    crmNoAgents: "Sin agentes asignados",
    crmNoLeads: "Sin líderes de equipo",
    crmUnassigned: "Sin asignar",
    crmNoData: "Aún no hay datos de equipos para mostrar.",
    crmFound: "encontrado(s)",
    crmViewProfile: "Ver perfil",
    tabOverview: "Resumen",
    tabAgentData: "Datos del agente",
    agentDataIntro: "Credenciales de correo y Zoho utilizadas por este agente.",
    agentDataAdminOnly: "Solo un administrador puede editar esta información.",
    gmailAddress: "Dirección de Gmail",
    department: "Departamento",
    manager: "Responsable",
    zohoBrandSoltren: "Zoho Mail — Soltrenpertners",
    zohoBrandIsp: "Zoho Mail — ISP Holdings",
    zohoMail: "Zoho Mail",
    zohoPassword: "Contraseña de Zoho",
    notSet: "No establecido",
    show: "Mostrar",
    hide: "Ocultar",
    copy: "Copiar",
    copied: "Copiado",
    saveChanges: "Guardar cambios",
    savedSuccess: "Guardado correctamente",
    saveFailed: "No se pudo guardar",
    editAgentData: "Editar",
    cancelEdit: "Cancelar",
    noAccessAgentData: "No tienes acceso a esta información."
  }
};

const SafariPrefs = {
  getTheme() {
    return localStorage.getItem("theme") || "dark";
  },
  setTheme(theme) {
    if (!SAFARI_THEMES.includes(theme)) return;
    document.body.className = theme;
    localStorage.setItem("theme", theme);
  },
  cycleTheme() {
    const themes = SAFARI_THEMES;
    const current = themes.indexOf(this.getTheme());
    const next = themes[(current + 1) % themes.length];
    this.setTheme(next);
    return next;
  },
  getLang() {
    return localStorage.getItem("lang") || "en";
  },
  setLang(lang) {
    if (!SAFARI_I18N[lang]) return;
    localStorage.setItem("lang", lang);
    this.applyLang(lang);
  },
  t(key) {
    const lang = this.getLang();
    return (SAFARI_I18N[lang] && SAFARI_I18N[lang][key]) || SAFARI_I18N.en[key] || key;
  },
  // Applies translations to any element carrying data-i18n / data-i18n-placeholder
  applyLang(lang) {
    const dict = SAFARI_I18N[lang] || SAFARI_I18N.en;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key]) el.innerText = dict[key];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (dict[key]) el.placeholder = dict[key];
    });
    document.dispatchEvent(new CustomEvent("safari:langchange", { detail: { lang } }));
  },
  init() {
    this.setTheme(this.getTheme());
    this.applyLang(this.getLang());
  }
};

// Renders the standard theme + language switcher into a container element.
function renderSafariPrefsWidget(containerEl) {
  containerEl.innerHTML = `
    <div class="safari-prefs">
      <button class="icon-btn" id="safariThemeBtn" title="Theme">🎨</button>
      <button class="icon-btn" id="safariLangBtn" title="Language">🌍</button>
      <div class="lang-menu" id="safariLangMenu">
        <button data-lang="en">🇺🇸 English</button>
        <button data-lang="ru">🇷🇺 Русский</button>
        <button data-lang="ua">🇺🇦 Українська</button>
        <button data-lang="fr">🇫🇷 Français</button>
        <button data-lang="es">🇪🇸 Español</button>
      </div>
    </div>
  `;

  containerEl.querySelector("#safariThemeBtn").addEventListener("click", () => {
    SafariPrefs.cycleTheme();
  });

  const langMenu = containerEl.querySelector("#safariLangMenu");
  containerEl.querySelector("#safariLangBtn").addEventListener("click", () => {
    langMenu.style.display = langMenu.style.display === "flex" ? "none" : "flex";
  });

  langMenu.querySelectorAll("button[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      SafariPrefs.setLang(btn.getAttribute("data-lang"));
      langMenu.style.display = "none";
    });
  });

  document.addEventListener("click", (e) => {
    if (!containerEl.contains(e.target)) langMenu.style.display = "none";
  });
}

/* =========================================================
   iOS-style emoji picker (shared across dashboard / user)
   ========================================================= */

const SAFARI_EMOJI_CATEGORIES = [
  {
    icon: "🙂",
    label: "Smileys & People",
    emojis: "😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 👻 👽 🤖 💩 🙈 🙉 🙊 👶 🧒 👦 👧 🧑 👨 👩 🧓 👴 👵 🤝 👍 👎 👏 🙌 🙏 💪 👋 ✌️ 🤞 🤟 🤘 👌 🤌 ✋ 👊 ❤️ 💔 💕 💖 💗 💘 💝 💯".split(" ")
  },
  {
    icon: "🐶",
    label: "Animals & Nature",
    emojis: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦆 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🦂 🐢 🐍 🦎 🦖 🐙 🦑 🦀 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🐘 🦛 🐪 🐫 🦒 🐃 🐂 🐄 🐎 🐖 🐑 🐐 🦌 🐕 🐩 🐈 🐓 🦃 🦅 🦚 🦜 🦢 🦩 🌵 🎄 🌲 🌳 🌴 🌱 🌿 ☘️ 🍀 🍁 🍂 🍃 🌷 🌹 🌻 🌼 🌸 💐 🌞 🌝 🌛 ⭐ 🌟 ✨ ⚡ 🔥 🌈 ☀️ ☁️ 🌧️ ❄️ ☃️ 🌊".split(" ")
  },
  {
    icon: "🍔",
    label: "Food & Drink",
    emojis: "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌽 🥕 🧄 🧅 🥔 🍠 🥐 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🌮 🌯 🥗 🍝 🍜 🍲 🍛 🍣 🍱 🍤 🍙 🍚 🍘 🍢 🍡 🍧 🍨 🍦 🥧 🍰 🎂 🧁 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🍼 ☕ 🍵 🧃 🥤 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉 🍾".split(" ")
  },
  {
    icon: "⚽",
    label: "Activity",
    emojis: "⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🏋️ 🤼 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🪕 🎻 🎲 ♟️ 🎯 🎳 🎮 🎰".split(" ")
  },
  {
    icon: "✈️",
    label: "Travel & Places",
    emojis: "🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍️ 🛺 🚲 🛴 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩️ 💺 🛰️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ 🪝 ⛽ 🚧 🚦 🚥 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ ⛺ 🏠 🏡 🏘️ 🏙️ 🌆 🌇 🌃 🌌 🌉 🌁".split(" ")
  },
  {
    icon: "💡",
    label: "Objects",
    emojis: "⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💽 💾 💿 📀 📷 📸 📹 🎥 📞 ☎️ 📟 📠 📺 📻 🎙️ ⏱️ ⏰ 🕰️ ⌛ ⏳ 📡 🔋 🔌 💡 🔦 🕯️ 🧯 🛢️ 💸 💵 💴 💶 💷 💰 💳 💎 ⚖️ 🧰 🔧 🔨 ⚒️ 🛠️ ⛏️ 🔩 ⚙️ 🧱 ⛓️ 🧲 🔫 💣 🧨 🔪 🗡️ ⚔️ 🛡️ 🚬 ⚰️ 🏺 🔮 📿 🧿 💈 ⚗️ 🔭 🔬 🕳️ 💊 🩹 🩺 🚪 🛏️ 🛋️ 🪑 🚽 🚿 🛁 🪒 🧴 🧷 🧹 🧺 🧻 🧼 🧽 🛒 🚩 🏳️ 🏴 📌 📍 ✏️ ✒️ 🖊️ 🖋️ 📝 📚 📖 🔖 🔑 🗝️".split(" ")
  },
  {
    icon: "❤️",
    label: "Symbols",
    emojis: "❤️ 🧡 💛 💚 💙 💜 🤎 🖤 🤍 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☯️ ✡️ 🔯 🕎 ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗ ❓ ❕ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ✅ ☑️ ✔️ ➕ ➖ ➗ ♻️ 🔄 🔃".split(" ")
  }
];

// Attaches an iOS/Telegram-style emoji popup picker to `btn`, inserting the
// chosen emoji into `input` at the caret position. Safe to call multiple
// times on a page (e.g. once per chat input).
function attachEmojiPicker(btn, input) {
  const picker = document.createElement("div");
  picker.className = "emoji-picker";

  const tabsHtml = SAFARI_EMOJI_CATEGORIES
    .map((cat, i) => `<button data-cat="${i}" class="${i === 0 ? "active" : ""}" title="${cat.label}">${cat.icon}</button>`)
    .join("");

  picker.innerHTML = `
    <div class="emoji-picker-tabs">${tabsHtml}</div>
    <div class="emoji-picker-search">
      <input type="text" placeholder="Search emoji">
    </div>
    <div class="emoji-picker-body"></div>
  `;

  document.body.appendChild(picker);

  const body = picker.querySelector(".emoji-picker-body");
  const searchInput = picker.querySelector(".emoji-picker-search input");
  const tabs = picker.querySelectorAll(".emoji-picker-tabs button");

  function renderCategory(idx) {
    const cat = SAFARI_EMOJI_CATEGORIES[idx];
    body.innerHTML = `
      <div class="emoji-picker-category-label">${cat.label}</div>
      <div class="emoji-picker-grid">
        ${cat.emojis.map(e => `<button type="button">${e}</button>`).join("")}
      </div>
    `;
    body.scrollTop = 0;
  }

  function renderSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      tabs.forEach((t, i) => t.classList.toggle("active", i === 0));
      renderCategory(0);
      return;
    }
    // Matches against category names (e.g. "food", "travel"); per-emoji
    // keyword search would need a much larger keyword dataset.
    const matchingCats = SAFARI_EMOJI_CATEGORIES.filter(c => c.label.toLowerCase().includes(q));
    const list = matchingCats.length
      ? matchingCats.flatMap(c => c.emojis)
      : SAFARI_EMOJI_CATEGORIES.flatMap(c => c.emojis);
    body.innerHTML = `
      <div class="emoji-picker-category-label">${matchingCats.length ? "Results" : "All emoji"}</div>
      <div class="emoji-picker-grid">
        ${list.map(e => `<button type="button">${e}</button>`).join("")}
      </div>
    `;
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      searchInput.value = "";
      renderCategory(Number(tab.getAttribute("data-cat")));
    });
  });

  searchInput.addEventListener("input", () => renderSearch(searchInput.value));

  body.addEventListener("click", (e) => {
    const target = e.target.closest("button");
    if (!target) return;
    const emoji = target.textContent;

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
    const caret = start + emoji.length;
    input.focus();
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  function positionPicker() {
    const rect = btn.getBoundingClientRect();
    const pickerHeight = 360;
    const margin = 8;
    let top = rect.top - pickerHeight - margin;
    if (top < margin) top = rect.bottom + margin;
    let left = rect.left;
    const maxLeft = window.innerWidth - 320 - margin;
    if (left > maxLeft) left = Math.max(margin, maxLeft);
    picker.style.top = `${top}px`;
    picker.style.left = `${left}px`;
  }

  function openPicker() {
    positionPicker();
    picker.classList.add("open");
    btn.classList.add("active");
  }

  function closePicker() {
    picker.classList.remove("open");
    btn.classList.remove("active");
  }

  renderCategory(0);

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (picker.classList.contains("open")) {
      closePicker();
    } else {
      document.querySelectorAll(".emoji-picker.open").forEach(p => p.classList.remove("open"));
      openPicker();
    }
  });

  document.addEventListener("click", (e) => {
    if (!picker.contains(e.target) && e.target !== btn) closePicker();
  });

  window.addEventListener("resize", () => {
    if (picker.classList.contains("open")) positionPicker();
  });

  return { close: closePicker };
}
