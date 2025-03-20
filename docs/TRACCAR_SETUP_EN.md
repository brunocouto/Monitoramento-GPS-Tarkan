# Traccar Setup Guide for Tarkan GPS Monitoring

This guide details how to install and configure the Traccar server to work with the Tarkan GPS Monitoring system.

## Introduction

Traccar is an open source GPS tracking server that supports more than 170 different protocols and devices. Tarkan GPS Monitoring uses Traccar as part of its backend to process GPS data from different devices.

## System Requirements

- Java 8 or higher
- MySQL database
- Available port for web interface (default: 8082)
- Available ports for GPS protocols (5023-5027)

## Installation

### Windows

1. Download the latest version of Traccar from [traccar.org/download](https://www.traccar.org/download/)
2. Run the installer and follow the instructions
3. The service will be installed automatically
4. Replace the configuration files with those provided in the `traccar/conf` folder of this repository

### Linux

1. Install Java:
   ```bash
   sudo apt update
   sudo apt install openjdk-11-jre-headless
   ```

2. Download and install Traccar:
   ```bash
   wget https://github.com/traccar/traccar/releases/download/v4.15/traccar-linux-64-4.15.zip
   unzip traccar-linux-64-4.15.zip
   sudo ./traccar.run
   ```

3. Replace the configuration files:
   ```bash
   sudo cp /path/to/traccar/conf/* /opt/traccar/conf/
   ```

4. Restart the service:
   ```bash
   sudo systemctl restart traccar
   ```

## Configuration

### Database

Edit the `traccar.xml` file in the configuration folder to set the database settings:

```xml
<entry key='database.driver'>com.mysql.jdbc.Driver</entry>
<entry key='database.url'>jdbc:mysql://localhost:3306/traccar_db?serverTimezone=UTC&amp;useSSL=false&amp;allowMultiQueries=true</entry>
<entry key='database.user'>traccar_user</entry>
<entry key='database.password'>your_password</entry>
```

Be sure to create the database and user in MySQL:

```sql
CREATE DATABASE traccar_db;
CREATE USER 'traccar_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON traccar_db.* TO 'traccar_user'@'localhost';
FLUSH PRIVILEGES;
```

### GPS Protocols

The `traccar.xml` file is already configured with ports for several common protocols:

- TK103/GPS103: Port 5024
- H02: Port 5025
- Coban: Port 5026
- Teltonika: Port 5027
- GT06: Port 5023

Add or remove protocols as needed.

### Integration with the Tarkan System

To integrate Traccar with the Tarkan system:

1. Configure the Traccar API:
   ```xml
   <entry key='api.enable'>true</entry>
   <entry key='api.port'>8083</entry>
   <entry key='api.key'>tarkan_api_key_change_this</entry>
   ```

2. Enable CORS to allow access from the Tarkan web interface:
   ```xml
   <entry key='web.cors.enable'>true</entry>
   <entry key='web.cors.origin'>*</entry>
   ```

## Verifying the Installation

1. Access the Traccar web interface at `http://your_server:8082/`
2. Log in with the default user (admin/admin)
3. Change the default password immediately
4. Verify that the database connection is working
5. Add a test device to verify that the server is receiving data

## Troubleshooting

### Logs

Traccar logs are available at:
- Windows: `C:\Program Files\Traccar\logs\tracker-server.log`
- Linux: `/opt/traccar/logs/tracker-server.log`

### Common Issues

- **Database Connection Error**: Check the credentials and if the MySQL server is running
- **Device Does Not Appear**: Check if the protocol port is open in the firewall
- **Server Does Not Start**: Check the logs to identify the problem

## References

- [Official Traccar Documentation](https://www.traccar.org/documentation/)
- [Supported Protocols](https://www.traccar.org/devices/)
- [Support Forum](https://www.traccar.org/forums/)