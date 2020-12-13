// JavaScript source code
var mysql = require('mysql');
var express = require('express');
var bodyParser = require('body-parser');
var mysqlEvent = require('@rodrigogs/mysql-events');


var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(3000, function () {
    console.log('Server Is Running...');
    console.log("Start timer");
    addTimer();
});

// Node 서버 - MySQL(RDS) 서버 연결 부분
var con = mysql.createConnection({
    host: "",
    user: "",
    database: "atchui",
    password: "",
    port: 3306
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Database Connected!!");
});

// FireBase 연결 및 관련 코드
var admin = require('firebase-admin');

var serviceAccount = require(' ');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://atchui.firebaseio.com"
});

const notification_options = {
    priority: "high",
    timeToLive: 60 * 60 * 24
};

var registrationToken = ' ';

var message = {
    data: {
        title: 'push title',
        body: 'push info'
    },

    token: registrationToken
};

function SendPushMessage(message) {
    admin.messaging().send(message)
        .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            console.log('Error sending message:', error);
        });
}

// MySQL 관련 코드

// 타이머
function addTimer() {
    let dayToMs = 1000 * 60 * 60 * 24;

    setInterval(() => {
        // 주기적으로 데이터 삭제
        DeleteOldData();
    }, dayToMs)
}

// 설정 관련
app.post('/user/option', function (req, res) {

    var user_id = req.body.user_id;
    var radius = req.body.radius_setting;
    var period = req.body.period_setting;

    // 삽입 수행
    var sql = 'INSERT INTO user_option (user_id, radius_setting, period_setting) VALUES (?, ?, ?)';
    var params = [user_id, radius, period];

    // 위에서 작성한 params 값이 value [?,?,?..] 에 들어가게 됨
    con.query(sql, params, function (err, result) {
        if (err) {
            console.log("option insert failed!");
            resultCode = 404;
            message = '옵션 저장 실패, 이미 존재함';
        } else {
            console.log("option insert succeed!");
            resultCode = 200;
            message = '옵션 저장 성공';
        }

        res.json({
            'code': resultCode,
            'message': message
        });
    });
});

app.post('/user/option/updateRad', function (req, res) {
    var user_id = req.body.user_id;
    var radius = req.body.radius_setting;

    var sql = 'UPDATE user_option SET radius_setting = ? WHERE user_id = ?';
    var params = [radius, user_id];

    // 위에서 작성한 params 값이 value [?,?,?..] 에 들어가게 됨
    con.query(sql, params, function (err, results) {
        if (err) {
            console.log('radius update error!');
            res.json({});
        } else {
            console.log('radius update successed!!');
            con.query('SELECT * FROM user_option WHERE user_id = ?', user_id, function (err, result) {
                if (!err) {
                    res.json({
                        'user_id': user_id,
                        'radius_setting': result[0].radius_setting,
                        'period_setting': result[0].period_setting
                    });
                }
            });
        }
    });
});

app.post('/user/option/updatePeriod', function (req, res) {

    var user_id = req.body.user_id;
    var period = req.body.period_setting;

    console.log(period);

    var sql = 'UPDATE user_option SET period_setting = ? WHERE user_id = ?';
    var params = [period, user_id];

    // 위에서 작성한 params 값이 value [?,?,?..] 에 들어가게 됨
    con.query(sql, params, function (err, results) {
        if (err) {
            console.log('period update error!');
            res.json({
                'user_id': user_id,
                'radius_setting': 0,
                'period_setting': 0
            });
        } else {
            console.log('period update successed!!');
            con.query('SELECT * FROM user_option WHERE user_id = ?', user_id, function (err, result) {
                if (!err) {
                    res.json({
                        'user_id': user_id,
                        'radius_setting': result[0].radius_setting,
                        'period_setting': result[0].period_setting
                    });
                }
            });
        }
    });
});

app.post('/user/getOption', function (req, res) {

    var user_id = req.body.user_id;

    // 삽입 수행
    var sql = 'SELECT * FROM user_option WHERE user_id = ?';
    var params = [user_id];

    // 위에서 작성한 params 값이 value [?,?,?..] 에 들어가게 됨
    con.query(sql, params, function (err, results) {
        if (err) {
            console.log(err);
        } else {
            console.log(user_id);
            if (results.length > 0) {

                var radius = results[0].radius_setting;
                var period = results[0].period_setting;

                res.json({
                    'user_id': user_id,
                    'radius_setting': radius,
                    'period_setting': period
                });

                console.log('client get option');
            }
            else {
                console.log('user_id:' + user_id + ' none option');
            }
        }
    });
});

// 확진자 경로 관련
app.post('/cnf_patient/route', function (req, res) {

    var sql = 'SELECT * FROM cnf_patient_route';
    con.query(sql, function (err, results) {
        if (err) {
            console.log(err);
        } else {
            var jArray = new Array(); // JSON ARRAY
            for (var i = 0; i < results.length; i++) {
                var jObj = new Object();

                jObj.cnf_route_id = results[i].cnf_route_id;
                jObj.cnf_id = results[i].cnf_id;
                jObj.visit_datetime = results[i].visit_datetime;
                jObj.location_name = results[i].location_name;
                jObj.address = results[i].address;
                jObj.latitude = results[i].latitude;
                jObj.longitude = results[i].longitude;
                jObj.color = results[i].color;

                jArray.push(jObj);

            }

            var strJson = JSON.stringify(jArray);

            res.json({
                "size": results.length,
                "list": strJson
            });

            InitPatientRouteColor();
            console.log('client gets patient route...');
        }
    });
});

// 유저 경로 관련
app.post('/user/SendRoute', function (req, res) {

    var user_id = req.body.user_id;
    var latitude = req.body.latitude;
    var longitude = req.body.longitude;

    var sql = 'INSERT INTO user_route (user_id, latitude, longitude, user_datetime) VALUES (?,?,?, now() + INTERVAL 9 HOUR)';
    var params = [user_id, latitude, longitude];

    con.query(sql, params, function (err, results) {
        if (err) {
            console.log(err);
        } else {
            console.log("UserRoute Insert Complete!");
            res.json({});
        }
    });

});

// 유저 경로 분석 현 위치 기반
app.post('/analysis/Present', async function (req, res) {
    console.log('=============[anal present]=============');

    // Client로 부터 사용자 ID,  사용자 위도 경도 받음
    var userData = new Object();

    userData.userID = req.body.user_id;
    userData.latitude = req.body.latitude;
    userData.longitude = req.body.longitude;

    // 데이터 저장할 배열과 오브젝트
    var cnfDataArray = new Array();
    var userOption = new Object();

    var code = 404;
    var message = 'failed';

    await InsertUserRouteData(userData);
    await GetUserRouteID(userData);

    await PushCnfData(cnfDataArray);
    await GetUserOption(userOption, userData.userID);

    if (cnfDataArray.length > 0) {
        AnalPresentRoute(userData ,cnfDataArray, userOption);
        console.log('send message');
        code = 200;
        message = 'completed';
        res.json({
            'code': code,
            'message': message
        });
    }
});

async function AnalPresentRoute(userData, ArrCnfData, userOption) {
    var cnfDataCnt = ArrCnfData.length;

    let userLat = userData.latitude;
    let userLng = userData.longitude;

    for (var i = 0; i < cnfDataCnt; ++i) {
        
        let cnfLat = ArrCnfData[i].latitude;
        let cnfLng = ArrCnfData[i].longitude;

        // 반경 검사 
        let dist = CalcDistance(userLat, userLng, cnfLat, cnfLng);

        console.log('dist:' + dist + ' radiusSetting: ' + userOption.radius_setting);
        if (dist <= userOption.radius_setting) {
            // 기간 검사
            var period = new Object();
            await GetPeriod(userData, ArrCnfData[i], period);
            console.log('period:' + period.period + ' periodSetting: ' + userOption.period_setting);

            if (period.period <= userOption.period_setting) {
                // 중복 검사 
                var Overlap = new Object();
                await CheckAnalOverlap(userData.user_route_id, ArrCnfData[i].cnf_route_id, Overlap);
                if (Overlap.bOverlap == false) {
                    // 중복 없을 때만 알림 목록 인서트
                    await InsertAnalysis(userData, ArrCnfData[i], 0);
                }

            }
        }
    }
}

// 유저 경로 분석 과거 경로 기반
app.post('/analysis/Past', async function (req, res) {
    // Client로 부터 사용자 ID 받음
    console.log('=============[anal past]=============');

    var userID = req.body.user_id;

    var UserDataArray = new Array();
    var CnfDataArray = new Array();
    var userOption = new Object();

    var code = 404;
    var message = 'failed';

    await PushUserData(UserDataArray, userID);
    await PushCnfData(CnfDataArray);
    await GetUserOption(userOption, userID);

    if (UserDataArray.length > 0 && CnfDataArray.length > 0) {
        AnalPastRoute(UserDataArray, CnfDataArray, userOption);
        console.log('send message');
        code = 200;
        message = 'completed';
        res.json({
            'code': code,
            'message': message
        });
    }
});

async function AnalPastRoute(ArrUserData, ArrCnfData, userOption) {
    var userDataCnt = ArrUserData.length;
    var cnfDataCnt = ArrCnfData.length;

    for (var i = 0; i < userDataCnt; ++i) {
        for (var j = 0; j < cnfDataCnt; ++j) {
            let userLat = ArrUserData[i].latitude;
            let userLng = ArrUserData[i].longitude;

            let cnfLat = ArrCnfData[j].latitude;
            let cnfLng = ArrCnfData[j].longitude;

            // 반경 검사 
            let dist = CalcDistance(userLat, userLng, cnfLat, cnfLng);

            console.log('dist:' + dist + ' radiusSetting: ' + userOption.radius_setting);
            if (dist <= userOption.radius_setting) {
                // 기간 검사
                var period = new Object();
                await GetPeriod(ArrUserData[i], ArrCnfData[j], period);
                console.log('period:' + period.period + ' periodSetting: ' + userOption.period_setting);

                if (period.period <= userOption.period_setting) {
                    // 중복 검사 
                    var Overlap = new Object();
                    await CheckAnalOverlap(ArrUserData[i].user_route_id, ArrCnfData[j].cnf_route_id, Overlap);
                    if (Overlap.bOverlap == false) {
                        // 중복 없을 때만 알림 목록 인서트
                        await InsertAnalysis(ArrUserData[i], ArrCnfData[j], 1);
                    }

                }
            }
        }
    }
}

// 유저 아이디에 해당되는 유저 동선 정보를 모두 배열에 담아주는 함수
function PushUserData(ArrUserData, userID) {
    return new Promise(function (resolve, reject) {
        var sql = 'SELECT * FROM user_route WHERE user_id = ?';
        con.query(sql, userID, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                console.log('pushing userdata...');
                for (var i = 0; i < res.length; i++) {
                    ArrUserData.push(res[i]);
                }
            }
            resolve();
        });
    })
}

// 모든 확진자 동선 정보를 배열에 담아주는 함수
function PushCnfData(ArrCnfData) {
    return new Promise(function (resolve, reject) {
        con.query('SELECT * FROM cnf_patient_route', function (err, res) {
            if (err) {
                console.log(err);
            } else {
                console.log('pushing cnfdata...');
                for (var i = 0; i < res.length; i++) {
                    ArrCnfData.push(res[i]);
                }
            }
            resolve();
        });
    });
}

// 유저 아이디에 해당되는 유저 옵션정보(설정한 반경, 기간) 가져오는 함수
function GetUserOption(UserOption, userID) {
    return new Promise(function (resolve, reject) {
        var params = [userID];
        con.query('SELECT * FROM user_option WHERE user_id = ?', params, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                if (res.length > 0) {
                    console.log('get userOption...');
                    UserOption.radius_setting = res[0].radius_setting;
                    UserOption.period_setting = res[0].period_setting;
                }
                else {
                    console.log('none userOption!');
                }
            }
            resolve();
        });
    })
}

// 유저 방문시간과 확진자 방문시간 비교해서 결과 주는 함수
function GetPeriod(userData, cnfData, period) {
    return new Promise(function (resolve, reject) {
        var params = [userData.user_datetime, cnfData.visit_datetime];
        con.query('SELECT TIMESTAMPDIFF(DAY, ?, ?) as period', params, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                period.period = Math.abs(res[0].period);
            }
            resolve();
        });
    })
}

function CheckAnalOverlap(userRouteID, cnfRouteID, Overlap) {
    return new Promise(function (resolve, reject) {
        var params = [userRouteID, cnfRouteID];
        console.log('Check Anal Overlap...');
        con.query('SELECT * FROM analysis WHERE (user_route_id = ? AND cnf_route_id = ?)', params, function (err, res) {
            if (err) {
                console.log(err);
                Overlap.bOverlap = false;
            } else {
                if (res.length > 0) {
                    // 중복 존재
                    console.log('Anal Overlap!');
                    Overlap.bOverlap = true;
                } else {
                    // 중복 없음
                    console.log('No Anal Overlap!');
                    Overlap.bOverlap = false;
                }
            }
            resolve();
        });
    })
}

function InsertUserRouteData(userData) {
    return new Promise(function (resolve, reject) {
        var sql = 'INSERT INTO user_route (user_id, latitude, longitude, user_datetime) VALUES (?,?,?, now() + INTERVAL 9 HOUR)';
        var params = [userData.userID, userData.latitude, userData.longitude];
        con.query(sql, params, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                console.log('Insert present user route!');
            }
            resolve();
        });
    });
}

// 가장 최근의 데이터를 가져옴
function GetUserRouteID(userData) {
    return new Promise(function (resolve, reject) {
        var sql = 'SELECT user_route_id FROM user_route ORDER BY user_route_id DESC LIMIT 1';
        con.query(sql, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                userData.user_route_id = res[0].user_route_id;
            }
            resolve();
        });
    })
}

function InsertAnalysis(userData, cnfData, IsPast) {
    return new Promise(function (resolve, reject) {
        var params = [userData.user_route_id, cnfData.cnf_route_id, IsPast];
        con.query('INSERT INTO analysis (user_route_id, cnf_route_id, anal_time, isPast) VALUES (?,?,now() + INTERVAL 9 HOUR, ?)', params, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                console.log('analysis insert complete!!');
            }
            resolve();
        });
    })
}

// 분석 테이블 클라이언트 전송
app.post('/analysis/GetAnalData', async function (req, res) {
    var userID = req.body.user_id;

    var arrAnal = new Array();
    var jArray = new Array();

    // 유저 아이디에 해당하는 정보를 가져와서 arrAnal에 넣어줌
    await GetAnalData_User(userID, arrAnal);

    for (var i = 0; i < arrAnal.length; i++) {
        var jObj = new Object();

        jObj.user_id = userID;
        jObj.user_route_id = arrAnal[i].user_route_id;
        jObj.user_latitude = arrAnal[i].latitude;
        jObj.user_longitude = arrAnal[i].longitude;
        jObj.user_visitDatetime = arrAnal[i].user_datetime;

        jObj.anal_id = arrAnal[i].anal_id;
        jObj.anal_time = arrAnal[i].anal_time;

        jObj.isPast = arrAnal[i].isPast;
        jObj.isRead = arrAnal[i].isRead;

        await GetAnalData_Cnf(arrAnal[i].anal_id, jObj);
        await GetCnfData_Anal(jObj);

        jArray.push(jObj);
    }

    var strJson = JSON.stringify(jArray);
    res.json({
        "size": arrAnal.length,
        "list": strJson
    });
});

function GetAnalData_User(userID, ArrayAnal) {
    return new Promise(function (resolve, reject) {
        var sql = 'SELECT * FROM vw_user_analysis WHERE user_id = ? ORDER BY user_datetime DESC';
        con.query(sql, userID, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                console.log('pushing user anal data...');
                for (var i = 0; i < res.length; i++) {
                    ArrayAnal.push(res[i]);
                }
            }
            resolve();
        })
    })
}

function GetAnalData_Cnf(analID, jObj) {
    return new Promise(function (resolve, reject) {
        var sql = 'SELECT * FROM vw_cnf_analysis WHERE anal_id = ?';
        con.query(sql, analID, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                if (res.length > 0) {
                    jObj.cnf_id = res[0].cnf_id;
                    jObj.cnf_route_id = res[0].cnf_route_id;
                    jObj.cnf_latitude = res[0].latitude;
                    jObj.cnf_longitude = res[0].longitude;
                    jObj.location_name = res[0].location_name;
                    jObj.cnf_visittime = res[0].visit_datetime;
                    jObj.color = res[0].color;
                }
            }
            resolve();
        })
    })
}

function GetCnfData_Anal(jObj) {
    return new Promise(function (resolve, reject) {
        var sql = 'SELECT *  FROM cnf_patient_info WHERE cnf_id = ?';
        con.query(sql, jObj.cnf_id, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                if (res.length > 0) {
                    jObj.infect_case = res[0].infect_case;
                    jObj.cnf_date = res[0].cnf_date;
                    jObj.province = res[0].province;
                    jObj.isolation_facility = res[0].isolation_facility;
                }
            }
            resolve();
        });
    });
}

app.post('/analysis/UpdateIsRead', function (req, res) {

    var anal_id = req.body.anal_id;
    var isRead = req.body.isRead;

    console.log('anal_id: ' + anal_id);
    console.log('isRead: ' + isRead);

    var sql = 'UPDATE analysis SET isRead = ? WHERE anal_id = ?';
    var params = [isRead, anal_id];

    // 위에서 작성한 params 값이 value [?,?,?..] 에 들어가게 됨
    con.query(sql, params, function (err, result) {
        if (err) {
            console.log('analIsRead update error!');
            res.json({
                'code': 404,
                'message': '실패'
            });
        } else {
            console.log('analIsRead update successed!!');
            res.json({
                'code': 200,
                'message': '성공'
            });
        }
    });
});

function CalcDistance(userLat, userLng, cnfLat, cnfLng) {
    var theta = userLng - cnfLng;
    var dist = Math.sin(DegToRad(userLat)) * Math.sin(DegToRad(cnfLat))
        + Math.cos(DegToRad(userLat)) * Math.cos(DegToRad(cnfLat)) * Math.cos(DegToRad(theta));
    dist = Math.acos(dist);
    dist = RadToDeg(dist);

    dist = dist * 60 * 1.1515;
    dist = dist * 1.609344;    // 단위 mile 에서 km 변환.  
    dist = dist * 1000.0;      // 단위  km 에서 m 로 변환 

    return dist;
}

function DegToRad(degree) {
    return (degree * Math.PI / 180);
}

function RadToDeg(radian) {
    return (radian * 180 / Math.PI);
}

// 확진자 동선 색깔 관련 함수
async function InitPatientRouteColor() {

    var ArrCnfData0 = new Array();
    var ArrCnfData1 = new Array();
    var ArrCnfData2 = new Array();

    await CalcPeriod_Color(ArrCnfData0, 0);
    for (var i = 0; i < ArrCnfData0.length; ++i) {
        await UpdateCnfData_Color(ArrCnfData0[i].cnf_route_id, 0);
    } // 0 ~ 1일
    await CalcPeriod_Color(ArrCnfData1, 1);
    for (var i = 0; i < ArrCnfData1.length; ++i) {
        await UpdateCnfData_Color(ArrCnfData1[i].cnf_route_id, 1);
    } // 2 ~ 4일
    await CalcPeriod_Color(ArrCnfData2, 2);
    for (var i = 0; i < ArrCnfData2.length; ++i) {
        await UpdateCnfData_Color(ArrCnfData2[i].cnf_route_id, 2);
    } // 4 ~ 9일
}

function CalcPeriod_Color(ArrCnfData, periodType) {
    return new Promise(function (resolve, reject) {
        var sql;
        switch (periodType) {
            case 0:
                sql = 'SELECT * FROM cnf_patient_route WHERE ABS(TIMESTAMPDIFF(DAY, cnf_patient_route.visit_datetime, now() + INTERVAL 9 HOUR)) <= 1'
                break;
            case 1:
                sql = 'SELECT * FROM cnf_patient_route WHERE ABS(TIMESTAMPDIFF(DAY, cnf_patient_route.visit_datetime, now() + INTERVAL 9 HOUR)) <= 4 AND ABS(TIMESTAMPDIFF(DAY, cnf_patient_route.visit_datetime, now() + INTERVAL 9 HOUR)) > 1'
                break;
            case 2:
                sql = 'SELECT * FROM cnf_patient_route WHERE ABS(TIMESTAMPDIFF(DAY, cnf_patient_route.visit_datetime, now() + INTERVAL 9 HOUR)) <= 9 AND ABS(TIMESTAMPDIFF(DAY, cnf_patient_route.visit_datetime, now() + INTERVAL 9 HOUR)) > 4'
                break;
        }
        con.query(sql, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                for (var i = 0; i < res.length; ++i) {
                    ArrCnfData.push(res[i]);
                }
            }
            resolve();
        });
    });
}

function UpdateCnfData_Color(cnfRouteID, color) {
    return new Promise(function (resolve, reject) {
        var params = [color, cnfRouteID];
        con.query('UPDATE cnf_patient_route SET color = ? WHERE cnf_route_id = ?', params, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                console.log('cnf_patient_route color Update completed!');
            }
            resolve();
        });
    });
}

// 동선 삭제 쿼리
function DeleteOldData() {
    var sql = 'DELETE FROM cnf_patient_route WHERE abs(TIMESTAMPDIFF(DAY, visit_datetime, now() + interval 9 hour)) > 15';
    con.query(sql, function (err, res) {
        if (err) {
            console.log(err);
        } else {
            console.log('delete old data completed!');
        }
    });
}


// geoCoder
const openGeocoder = require('node-open-geocoder');

// MySQL이벤트 리스너
const MySQLEvents = require('@rodrigogs/mysql-events');

const program = async () => {
    const connection = con;

    const instance = new MySQLEvents(connection, {
        startAtEnd: true
    });

    await instance.start()
        .then(() => console.log('MySqlEventListner Is Running!'))
        .catch(err => console.error('MySqlEventListner Error!'));

    instance.addTrigger({
        name: 'cnf patient route insert',
        expression: 'atchui.cnf_patient_route.*',
        statement: MySQLEvents.STATEMENTS.INSERT,
        onEvent: (event) => {
            onInsertPatientRoute();
        },
    });

    instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
    instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);
};

function onInsertPatientRoute() {
    var sql = 'SELECT * from cnf_patient_route WHERE cnf_route_id = (SELECT max(cnf_route_id) FROM cnf_patient_route)';
    con.query(sql, function (error, results) {
        if (error) {
            console.log(error);
        } else {
            openGeocoder()
                .geocode(results[0].address)
                .end((err, res) => {
                    if (!err) {
                        InsertLatAndLng(res[0].lat, res[0].lon, results[0]);
                    }
                })
        }
    });
}

function InsertLatAndLng(lat, lon, result) {

    var routeID = result.cnf_route_id;

    // 업데이트 수행
    var sql = 'UPDATE cnf_patient_route SET latitude = ?, longitude = ? WHERE cnf_route_id = ?';
    var params = [lat, lon, routeID];

    console.log(lat, lon)

    // 위에서 작성한 params 값이 value [?,?,?..] 에 들어가게 됨
    con.query(sql, params, function (err, result) {
        if (err) {
            console.log(sql + 'update error!');
        } else {
            console.log('update successed!!');
        }

    });
}

program()
   .then(() => console.log('Waiting for database events...'))
   .catch(console.error);