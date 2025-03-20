// Configuração otimizada do Firebase
import firebase from 'firebase/app';

// Importe apenas os módulos necessários
// Descomente os módulos que você realmente usa
// import 'firebase/auth';
// import 'firebase/firestore';
// import 'firebase/database';
// import 'firebase/storage';
// import 'firebase/analytics';

// Configuração do Firebase (será preenchida pelo config.js)
const firebaseConfig = window.firebaseConfig || {
  // Configurações padrão serão substituídas
};

// Inicializar Firebase apenas se ainda não tiver sido inicializado
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export default firebase;