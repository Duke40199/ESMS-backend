"use strict";
import { Op } from "sequelize";
import models from "../db/models/index";
import status from "http-status";
import url from "url";
import jwt from "jsonwebtoken";
import { DefaultError } from "../utils/errorHandler";
import { shiftStatus } from "../db/config/statusConfig";
import { shiftTypes } from "../db/config/shiftTypeConfig";
import { setEpochMillisTime } from "../utils/timeUtil";
const moment = require('moment-timezone');
export default {
  min_date:{
    async get(req, res, next) {
      try {
        const minDate = await models.Session.min('sessionStart')
        res.status(200).send({
          success: true,
          message: minDate,
        });
      } catch (error) {
        next(error);
      }
    },
  },
  available:{
    async get(req, res, next) {
      const { employeeCode } = req.query;
      const startDate = req.query.startDate
          ? req.query.startDate
          : setEpochMillisTime(0, 0, 0, 0, 0);
      const endDate = req.query.endDate ? req.query.endDate : new Date();
      try {
        let employee
        if(employeeCode !== undefined){
          employee = await models.Employee.findOne({
            where: {
              employeeCode: employeeCode
            }
          })
        }
        let whereEmployeeCondition = ""
        if(employee){
          whereEmployeeCondition = {
            employeeId: employee.id
          }
        }
        let date = new Map()
        let tempDate = moment(startDate)
        while(tempDate.tz("Asia/Ho_Chi_Minh").format("DD-MM-YYYY") <= moment(endDate).tz("Asia/Ho_Chi_Minh").format("DD-MM-YYYY")){
          let temp = tempDate.tz("Asia/Ho_Chi_Minh").format("DD-MM-YYYY")
          await models.Session.findAndCountAll({
            where: {
              [Op.and]: [
                {
                  sessionStart: { [Op.gte]: new Date(tempDate.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD") + "T00:00:00.000+07:00")},
                },
                {
                  sessionEnd: { [Op.lt]: new Date(moment(tempDate).tz("Asia/Ho_Chi_Minh").add(1, 'days').format("YYYY-MM-DD") + "T00:00:00.000+07:00") },
                },
                whereEmployeeCondition,
              ],
            }
          }).then(result =>{
            date[temp] = result.count
          })
          tempDate = tempDate.add(1, 'days')
        }
        res.status(200).send({
          success: true,
          message: date,
        });
      } catch (error) {
        next(error);
      }
    },
  },
  view: {
    async get(req, res, next) {
      try {
        const token = req.headers.authorization.replace("Bearer ", "");
        const tokenDecoded = jwt.decode(token);
        const user = await models.Employee.findOne({
          where: {
            id: tokenDecoded.employeeId,
          },
        });
        //Data from request
        const { order, employeeCode, fullname, status, shiftType } = req.query;
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const offset = limit * (page - 1);
        const startDate = req.query.startDate
          ? req.query.startDate
          : setEpochMillisTime(0, 0, 0, 0, 0);
        const endDate = req.query.endDate ? req.query.endDate : new Date();
        console.log(`=========================start date:${startDate}`);
        //generate condition
        let whereEmployeeCondition = null;
        let whereShiftCondition = "";
        let employee;
        if (fullname || employeeCode != undefined) {
          employee = await models.Employee.findOne({
            where: {
              [Op.or]: [
                { employeeCode: { [Op.like]: "%" + employeeCode + "%" } },
                { fullname: { [Op.like]: "%" + fullname + "%" } },
              ],
            },
          });
          whereEmployeeCondition = {
            employee_id: employee.id,
          };
        }
        var whereCondition = ""
        if(user.roleId === 3){
          whereCondition = {
            [Op.and]: [
              {
                sessionStart: { [Op.gte]: startDate },
              },
              {
                sessionEnd: { [Op.lt]: endDate },
              },
              whereEmployeeCondition,
            ],
          };
        }
        else {
          whereCondition = {
            [Op.and]: [
              {
                sessionStart: { [Op.gte]: startDate },
              },
              {
                sessionEnd: { [Op.lt]: endDate },
              },
              {
                angryWarningCount: { [Op.gt]: 0 }
              },
              whereEmployeeCondition,
            ],
          };
        }
        //order the result
        // var orderQuery = order ? order : "id,desc";
        // const orderOptions = orderQuery.split(",");
        //query starts here.
        const sessions = await models.Session.findAll({
          attributes: [
            "id",
            // "employeeId",
            "sessionStart",
            "sessionEnd",
            "sessionDuration",
            // 'info',
            "angryWarningCount",
            "customerName"
          ],
          where: whereCondition,
          include: [
            {
              model: models.EmployeeShift,
              attributes: [],
              where: whereShiftCondition,
              as: "EmployeeShift",
            },
          ],
          order: [
            ['sessionStart', 'DESC']
          ],
          raw: false,
          limit: limit,
          offset: offset,
          distinct: true,
        });
        //get result by positive/negative
        let sessionResults = [];
        let angryWarningCount = 0;
        let totalWarningSession = 0;
        let angryInDayOfWeeks = {
          Monday: 0,
          Tuesday: 0,
          Wednesday: 0,
          Thursday: 0,
          Friday: 0,
          Saturday: 0,
          Sunday: 0,
        };
        for (const session of sessions) {
          const employee = await models.Employee.findByPk(session.employeeId);
          // session.setDataValue("avatarUrl", employee.avatarUrl);
          // session.setDataValue("employeeFullname", employee.fullname);
          if (session.info != undefined) {
            const parsedInfo = JSON.parse(session.info);
          }
          sessionResults.push(session);
          if(session.angryWarningCount > 0){
            totalWarningSession += 1
          }
          angryWarningCount += session.angryWarningCount;
          var sStartDate = session.sessionStart;
          var dayOfWeek = new Date(sStartDate).toLocaleString("en-US", {
            timeZone: "Asia/Ho_Chi_Minh",
            // timeZone: "Pacific/Fiji",
            weekday: "long",
            // year: 'numeric',
            // month: 'long',
            // day: 'numeric',
            // hour12: false,
            // hour: 'numeric',
            // minute: 'numeric',
            // second: 'numeric'
          });
          angryInDayOfWeeks[dayOfWeek] += session.angryWarningCount;
        }
        let result = {
          summary: {
            angryWarningCount: angryWarningCount,
            totalSessions: sessions.length,
            totalWarningSession: totalWarningSession,
            angryInDayOfWeeks: angryInDayOfWeeks,
          },
          sessions: sessionResults,
        };
        res.status(200).send({
          success: true,
          message: result,
        });
      } catch (error) {
        next(error);
      }
    },
  },

  view_one: {
    async get(req, res, next) {
      try {
        const { sessionId } = req.params;
        if (!sessionId) {
          res.send({
            success: false,
            message: "Please input session id.",
          });
        }
        const session = await models.Session.findOne({
          where: {
            id: sessionId,
          },
        });
        if (session != undefined && session.info != undefined) {
          const parsedInfo = JSON.parse(session.info);
          session.setDataValue("info", parsedInfo);
        }
        // const emotionDurations = getEmotionDurations(session);
        // session.setDataValue('emotionDurations', emotionDurations)
        res.status(status.OK).send({
          success: true,
          message: session,
        });
      } catch (error) {
        next(error);
      }
    },
  },
  create: {
    async post(req, res, next) {
      try {
        const token = req.headers.authorization.replace("Bearer ", "");
        const { customerName } = req.query
        const tokenDecoded = jwt.decode(token);
        //create null session
        const currentEmployeeShift = await models.EmployeeShift.findOne({
          where: {
            employee_id: tokenDecoded.employeeId,
            status_id: shiftStatus.ACTIVE,
          },
        });
        const createdSession = await models.Session.create({
          employeeId: tokenDecoded.employeeId,
          employee_shift_id: currentEmployeeShift.id,
          customerName: customerName,
        });
        res.status(status.CREATED).send({
          success: true,
          message: { id: createdSession.id },
        });
      } catch (error) {
        next(error);
      }
    },
  },
  end_session: {
    async put(req, res, next) {
      try {
        const { sessionId } = req.params;
        const { info } = req.body;
        // //check whether all tasks has been completed.r
        // const isRemainingTask = await models.SessionTask.findOne({
        //   where:
        //   {
        //     [Op.and]: [
        //       { sessionId: sessionId },
        //       { statusId: { [Op.ne]: sessionTaskStatus.COMPLETED } },
        //     ]
        //   },
        // })
        // //if there's a task that is found not completed
        // if (isRemainingTask) {
        //   res.status(500).send({
        //     success: false,
        //     message: "Incomplete task(s) found!"
        //   });
        // } else {
        const emotions = req.body.emotions;
        //if there's no emotion in request body
        if (!emotions) {
          res.status(status.INTERNAL_SERVER_ERROR).send({
            success: false,
            message: "No emotion in session!",
          });
        } else {
          let periodList = [];
          for (const emotion of emotions) {
            const periods = emotion.periods;
            for (const period of periods) {
              let addResult = {
                sessionId: sessionId,
                emotionId: emotion.emotion,
                periodStart: period.periodStart,
                periodEnd: period.periodEnd,
                duration: period.duration,
              };
              periodList.push(addResult);
            }
          }
          const addPeriodResult = await models.Period.bulkCreate(periodList);
          if (addPeriodResult) {
            const result = await models.Session.update(
              {
                sessionEnd: new Date(),
                // info: info
                info: info,
                angryWarningCount: JSON.parse(info).angry_warning,
                sessionDuration: JSON.parse(info).total_session_duration,
              },
              {
                where: {
                  id: sessionId,
                },
              }
            );
            res.status(status.CREATED).send({
              success: true,
              message: result,
            });
          }
        }
        // }
      } catch (error) {
        next(error);
      }
    },
  },
  get_guideline: {
    async get(req, res, next) {
      try {
        const guideline = await models.Guideline.findOne({
          where: {
            title: req.params.title,
          },
        });
        res.status(status.OK).send({
          success: true,
          message: guideline,
        });
      } catch (error) {
        next(error);
      }
    },
  },
  // view_old: {
  //   async get(req, res, next) {
  //     try {
  //       //Data from request
  //       const queryData = url.parse(req.url, true).query;
  //       var query = queryData.query;
  //       var whereCondition;
  //       //Validate data from request
  //       if (query == undefined) {
  //         query = '';
  //         whereCondition = null;
  //       } else {
  //         const employee = await models.Employee.findOne({
  //           where: { employeeCode: query },
  //           attributes: ['id', 'employeeCode']
  //         });
  //         if (employee) {
  //           whereCondition = {
  //             employeeId: employee.id
  //           }
  //         }
  //         else {
  //           whereCondition = {
  //             employeeId: query
  //           }
  //         }
  //       }
  //       if (queryData.order == undefined) {
  //         queryData.order = 'created_at,asc'
  //       }
  //       const orderOptions = queryData.order.split(",");

  //       const sessions = await models.Session.findAll({
  //         include: [{
  //           model: models.Period
  //         }],
  //         attributes: [
  //           'id',
  //           'employeeId',
  //           'sessionStart',
  //           'sessionEnd',
  //           'createdAt',
  //           'updatedAt',
  //         ],
  //         where: whereCondition,
  //         order: [
  //           [orderOptions[0], orderOptions[1]],
  //         ],
  //         raw: false,
  //         distinct: true,
  //       });
  //       res.status(status.OK)
  //         .send({
  //           success: true,
  //           message: sessions,
  //         });
  //     } catch
  //     (error) {
  //       next(error);
  //     }
  //   }
  // },
};
