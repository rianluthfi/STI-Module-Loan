/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/error', 'N/url'],
    function(error, url) {
        function pageInit(context) {
            if (context.mode !== 'create')
                return;

        }
        function saveRecord(context) {

            return true;
        }
        function validateField(context) {

            return true;
        }
        function fieldChanged(context) {

        }
        function postSourcing(context) {

        }
        function lineInit(context) {

        }
        function validateDelete(context) {

            return true;
        }
        function validateInsert(context) {
           
            return true;
        }
        function validateLine(context) {
            
            return true;
        }
        function sublistChanged(context) {
            
        }
		
		
		function goToSuitelet(script_id, deployment_id){
			
			document.location = url.resolveScript({
                scriptId : script_id,
                deploymentId : deployment_id
            });
			
		}
		
        return {
            pageInit: pageInit,
            // fieldChanged: fieldChanged,
            // postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            // validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            // saveRecord: saveRecord,
			goToSuitelet : goToSuitelet
        };
    });