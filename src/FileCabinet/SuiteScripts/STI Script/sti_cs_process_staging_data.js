/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/url', 'N/format'],
    function (url, format) {
    function fieldChanged(context) {
		
		if (
			context.fieldId == 'custpage_pageid' || 
			context.fieldId == 'custpage_transaction_type' || 
			context.fieldId == 'custpage_loan_id' || 
			context.fieldId == 'custpage_delivery_date' || 
			context.fieldId == 'custpage_repayment_date' || 
			context.fieldId == 'custpage_supplier_transfer' || 
			context.fieldId == 'custpage_lender' ||
			context.fieldId == 'custpage_collection_bank' ||
			context.fieldId == 'custpage_collection_type'
		) {
            var pageId = context.currentRecord.getValue({
				fieldId : 'custpage_pageid'
			});
			
			var transactionType = context.currentRecord.getValue({
				fieldId : 'custpage_transaction_type'
			});
			
			var loanID = context.currentRecord.getValue({
				fieldId : 'custpage_loan_id'
			});
			
			var supplierTransfer = context.currentRecord.getValue({
				fieldId : 'custpage_supplier_transfer'
			});
			
			var lender = context.currentRecord.getValue({
				fieldId : 'custpage_lender'
			});
			
			var tempDate = context.currentRecord.getValue({
				fieldId : 'custpage_delivery_date'
			});
			
			var deliveryDate = '';
			
			if (tempDate != ''){
				var deliveryDate = format.format({
					value: tempDate,
					type: format.Type.DATE
				}); //Returns "8/25/2015
			}
			
			var tempDateRepayment = context.currentRecord.getValue({
				fieldId : 'custpage_repayment_date'
			});
			
			var repaymentDate = '';
			
			if (tempDateRepayment != ''){
				var repaymentDate = format.format({
					value: tempDateRepayment,
					type: format.Type.DATE
				}); //Returns "8/25/2015
			}
			
			var collectionbank = context.currentRecord.getValue({
				fieldId : 'custpage_collection_bank'
			});
			
			var collectiontype = context.currentRecord.getValue({
				fieldId : 'custpage_collection_type'
			});
			
			
			// alert(typeof tempDate+' '+tempDate);
			// alert(typeof soDate+' '+soDate);

            pageId = parseInt(pageId.split('_')[1]);

            document.location = url.resolveScript({
                    scriptId : getParameterFromURL('script'),
                    deploymentId : getParameterFromURL('deploy'),
                    params : {
                        'page' 				: pageId,
						'lender' 			: lender,
						'transactiontype' 	: transactionType,
						'deliverydate' 		: deliveryDate,
						'repaymentdate' 	: repaymentDate,
						'loanid' 			: loanID,
						'suppliertransfer'	: supplierTransfer,
						'collectionbank'	: collectionbank,
						'collectiontype'	: collectiontype
                    }
                });
        }
    }

    function getSuiteletPage(suiteletScriptId, suiteletDeploymentId, pageId) {
        document.location = url.resolveScript({
                scriptId : suiteletScriptId,
                deploymentId : suiteletDeploymentId,
                params : {
                    'page' : pageId
                }
            });
    }

    function getParameterFromURL(param) {
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split("=");
            if (pair[0] == param) {
                return decodeURIComponent(pair[1]);
            }
        }
        return (false);
    }
	
	function refreshPageStatus(){
		
		alert('refreshPageStatus');
		
		document.location = url.resolveScript({
			scriptId : 'customscript_sti_sl_status_released_disb',
			deploymentId : 'customdeploy_sti_sl_status_released_disb'
		});
	}

    return {
        fieldChanged : fieldChanged,
        getSuiteletPage : getSuiteletPage
    };

});