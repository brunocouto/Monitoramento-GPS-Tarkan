/**
 * Sistema de Monitoramento GPS Tarkan
 * Definição das rotas da API REST
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const deviceController = require('../controllers/deviceController');
const positionController = require('../controllers/positionController');
const userController = require('../controllers/userController');
const geofenceController = require('../controllers/geofenceController');
const reportController = require('../controllers/reportController');
const alertController = require('../controllers/alertController');
const { authenticateToken, checkAdminRole } = require('../middleware/auth');

// Rotas de autenticação
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/logout', authenticateToken, authController.logout);
router.post('/auth/register', authController.register);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);

// Rotas de usuários
router.get('/users', authenticateToken, checkAdminRole, userController.getAllUsers);
router.get('/users/:id', authenticateToken, userController.getUserById);
router.post('/users', authenticateToken, checkAdminRole, userController.createUser);
router.put('/users/:id', authenticateToken, userController.updateUser);
router.delete('/users/:id', authenticateToken, checkAdminRole, userController.deleteUser);
router.get('/users/profile', authenticateToken, userController.getUserProfile);
router.put('/users/profile', authenticateToken, userController.updateUserProfile);

// Rotas de dispositivos (veículos/rastreadores)
router.get('/devices', authenticateToken, deviceController.getAllDevices);
router.get('/devices/:id', authenticateToken, deviceController.getDeviceById);
router.post('/devices', authenticateToken, deviceController.createDevice);
router.put('/devices/:id', authenticateToken, deviceController.updateDevice);
router.delete('/devices/:id', authenticateToken, deviceController.deleteDevice);
router.get('/devices/:id/status', authenticateToken, deviceController.getDeviceStatus);
router.put('/devices/:id/maintenance', authenticateToken, deviceController.setMaintenanceMode);
router.post('/devices/:id/command', authenticateToken, deviceController.sendCommand);

// Rotas de posições
router.get('/positions', authenticateToken, positionController.getPositions);
router.get('/positions/latest', authenticateToken, positionController.getLatestPositions);
router.get('/positions/device/:deviceId', authenticateToken, positionController.getPositionsByDevice);
router.get('/positions/history', authenticateToken, positionController.getPositionHistory);
router.post('/positions', positionController.createPosition); // Endpoint para receber dados do dispositivo
router.post('/positions/batch', positionController.createBatchPositions); // Receber múltiplas posições

// Rotas de geocercas
router.get('/geofences', authenticateToken, geofenceController.getAllGeofences);
router.get('/geofences/:id', authenticateToken, geofenceController.getGeofenceById);
router.post('/geofences', authenticateToken, geofenceController.createGeofence);
router.put('/geofences/:id', authenticateToken, geofenceController.updateGeofence);
router.delete('/geofences/:id', authenticateToken, geofenceController.deleteGeofence);
router.get('/geofences/device/:deviceId', authenticateToken, geofenceController.getGeofencesByDevice);
router.post('/geofences/:id/devices', authenticateToken, geofenceController.assignDevicesToGeofence);

// Rotas de relatórios
router.get('/reports/summary', authenticateToken, reportController.getSummaryReport);
router.get('/reports/trips', authenticateToken, reportController.getTripsReport);
router.get('/reports/stops', authenticateToken, reportController.getStopsReport);
router.get('/reports/events', authenticateToken, reportController.getEventsReport);
router.get('/reports/speed', authenticateToken, reportController.getSpeedReport);
router.get('/reports/fuel', authenticateToken, reportController.getFuelReport);
router.get('/reports/export/:type', authenticateToken, reportController.exportReport);
router.post('/reports/schedule', authenticateToken, reportController.scheduleReport);

// Rotas de alertas
router.get('/alerts', authenticateToken, alertController.getAllAlerts);
router.get('/alerts/:id', authenticateToken, alertController.getAlertById);
router.post('/alerts', authenticateToken, alertController.createAlert);
router.put('/alerts/:id', authenticateToken, alertController.updateAlert);
router.delete('/alerts/:id', authenticateToken, alertController.deleteAlert);
router.get('/alerts/device/:deviceId', authenticateToken, alertController.getAlertsByDevice);
router.put('/alerts/:id/status', authenticateToken, alertController.updateAlertStatus);
router.post('/alerts/notification/test', authenticateToken, alertController.testNotification);

// Rota de health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rota de documentação da API
router.get('/docs', (req, res) => {
  res.redirect('/api-docs');
});

module.exports = router;