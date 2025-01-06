/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([],
    
    () => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */

        /**
         * This file used for Global Parameter Only
         * 
         * 05 Jan 2025
         *      Date PPN Rate               custscript_param_date_ppn_rate
         *      Date Lender Interest Rate   custscript_param_date_lender_int_rate
         *      Date Lender PPH Tax Rate    custscript_param_date_lender_pphtax_rate
         *      Date Grace Period           custscript_param_date_grace_period
         * 
         * Other Global Parameter at
         *      1. customscript_sti_sch_sd_single_process with script_id 260
         *          Default Subsidiary Main Process
         *          Different Account
         *      2. customscript_sti_sl_rep_con_wh_idr_v2 with script_id 280
         *          List Account ID Off Balance Sheet
         */
        const onRequest = (scriptContext) => {

        }

        return {onRequest}

    });
