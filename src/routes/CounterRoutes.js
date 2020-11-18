'use strict'

/**
 * Counter Route
 * path: /counters
 */

import express from 'express';
import Controller from '../controllers/CounterController';
let router = express.Router();
//auth imports
import passport from 'passport';
import { isAdmin, isAuthorized,isBankTeller, isManager, isManagerOrAdmin } from '../middlewares/authorization';

/**
* @swagger
* /counters/{id}:
*   get:
*     tags:
*       - Counters
*     name: Get counters.
*     summary: get a list of counters
*     consumes:
*       - application/json
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: integer
*           nullable: true
*         description: counter id to filter counters.
*     responses:
*       200:
*         description: A list of sessions is displayed.
*       400:
*         description: Error.
*/

router.get('/:id', passport.authenticate('jwt', { session: false }), isAuthorized, Controller.view.get);

/**
* @swagger
* /counters:
*   post:
*     tags:
*       - Counters
*     name: Create counter(s).
*     summary: Create new counter(s)
*     consumes:
*       - application/json
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               counters:
*                 type: array
*                 items:
*                   type: object
*                   properties:
*                     name:
*                       type: string
*                     number:
*                       type: integer
*     responses:
*       201:
*         description: A list of counters added is displayed.
*       400:
*         description: Error.
*       401:
*         description: Forbidden.
*/
router.post('/', passport.authenticate('jwt', { session: false }), isManagerOrAdmin, Controller.create_bulk.post);

/**
* @swagger
* /counters:
*   put:
*     tags:
*       - Counters
*     name: Update counter(s).
*     summary: Update new counter(s)
*     consumes:
*       - application/json
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               counters:
*                 type: array
*                 items:
*                   type: object
*                   properties:
*                     id:
*                       type: integer
*                     name:
*                       type: string
*                     number:
*                       type: integer
*     responses:
*       201:
*         description: A list of counters added is displayed.
*       400:
*         description: Error.
*       401:
*         description: Forbidden.
*/
router.put('/', passport.authenticate('jwt', { session: false }), isManagerOrAdmin, Controller.update_bulk.put);

/**
* @swagger
* /counters:
*   delete:
*     tags:
*       - Counters
*     name: Delete counter(s).
*     summary: Delete new counter(s)
*     consumes:
*       - application/json
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               ids:
*                 type: array
*                 items:
*                   type: integer
*     responses:
*       201:
*         description: A list of counters added is displayed.
*       400:
*         description: Error.
*       401:
*         description: Forbidden.
*/
router.delete('/', passport.authenticate('jwt', { session: false }), isManagerOrAdmin, Controller.delete_bulk.delete);


export default router;
