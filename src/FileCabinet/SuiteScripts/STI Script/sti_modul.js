/**
  *@NApiVersion 2.x
 */

//Custom Module .js file

define(['N/search',
	'N/record',
	'N/task',
	'N/query',
	'N/runtime',
	'N/format',
	'/SuiteScripts/STI Script/moment.js',
], function (search,
	record,
	task,
	query,
	runtime,
	format,
	moment) {

	var myScript = runtime.getCurrentScript();

	var main_subsidiary = runtime.getCurrentScript().getParameter({
		name: 'custscript_sti_sch_default_subsidiary'
	});

	var ACC_DIFFERENCE = runtime.getCurrentScript().getParameter({
		name: 'custscript_sti_difference_account'
	});

	var PARAM_DATE = {
		'ppn_rate' : runtime.getCurrentScript().getParameter({name: 'custscript_param_date_ppn_rate'}),
		'lender_interest_rate' : runtime.getCurrentScript().getParameter({name: 'custscript_param_date_lender_int_rate'}),
		'lender_pph_tax_rate' : runtime.getCurrentScript().getParameter({name: 'custscript_param_date_lender_pphtax_rate'}),
		'grace_period' : runtime.getCurrentScript().getParameter({name: 'custscript_param_date_grace_period'}),
	}


	function createBGProcess(id_staging_data) {

		var bgProcess = record.create({
			type: 'customrecord_sti_bg_process_stag_data',
			isDynamic: true
		});

		bgProcess.setValue('custrecord_sti_bpsd_id_staging_data', id_staging_data);
		bgProcess.setValue('custrecord_sti_bpsd_status', 1);

		bgProcess.save();

		return bgProcess.id;

	}

	function updateBGProcess(id_bg_process, status_id, template_type, calculate_record, journal_1, journal_2, error) {

		var bgProcess = record.load({
			type: 'customrecord_sti_bg_process_stag_data',
			id: id_bg_process,
			isDynamic: true
		});

		if (status_id != '') {
			bgProcess.setValue('custrecord_sti_bpsd_status', status_id);
		}
		if (template_type != '') {
			bgProcess.setValue('custrecord_sti_bpsd_template_type', template_type);
		}
		if (calculate_record != '') {
			bgProcess.setValue('custrecord_sti_bpsd_calculation_rec', calculate_record);
		}
		if (journal_1 != '') {
			bgProcess.setValue('custrecord_sti_bpsd_1_journal', journal_1);
		}
		if (journal_2 != '') {
			bgProcess.setValue('custrecord_sti_bpsd_2_journal', journal_2);
		}
		if (error != '') {
			bgProcess.setValue('custrecord_sti_bpsd_error_message', error);
		}

		bgProcess.save();

	}



	function getLenderId(lender) {

		var internalid = '';

		var searchLender = search.create({
			type: search.Type.VENDOR,
			columns: ['internalid', 'entityid'],
			filters: [['entityid', 'is', lender], 'and', ['isinactive', 'is', false]]
		});

		var myResultSet = searchLender.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 1
		});

		if (resultRange.length > 0) {
			internalid = resultRange[0].getValue({
				name: 'internalid'
			});
		}

		return internalid;
	}

	function countRepaymentByLoanID(loanID) {

		var searchData = search.create({
			type: 'customtransaction_sti_repayment',
			columns: [
				{ name: 'internalid', summary: search.Summary.GROUP },
				{ name: 'custrecord_sti_loan_id', join: 'custbody_sti_related_staging_data', summary: search.Summary.GROUP }
			],
			filters: ['custbody_sti_related_staging_data.custrecord_sti_loan_id', 'is', loanID]
		});

		var myResultSet = searchData.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 100
		});

		log.debug('countRepaymentByLoanID resultRange', resultRange);

		return resultRange.length;

	}

	function defineFilter(transactionType, lenderType, supplierTransfer, firstPayement) {
		var filter = [];

		filter.push(search.createFilter({
			name: 'custrecord_sti_tt_transaction_type',
			operator: search.Operator.IS,
			values: transactionType
		}));

		if (transactionType == 'disbursement') {
			if (supplierTransfer != '') {
				filter.push(search.createFilter({
					name: 'custrecord_sti_tt_supplier_transfer',
					operator: search.Operator.IS,
					values: supplierTransfer
				}));
			}
		}


		filter.push(search.createFilter({
			name: 'custrecord_sti_tt_lender_type',
			operator: search.Operator.IS,
			values: lenderType
		}));

		filter.push(search.createFilter({
			name: 'custrecord_sti_tt_fullpaid',
			operator: search.Operator.IS,
			values: firstPayement
		}));


		return filter;
	}

	function setTemplateType(idRecord, idTemplateType) {

		var data = record.load({
			type: 'customrecord_sti_calculation_formula',
			id: idRecord,
			isDynamic: true,
		});

		data.setValue('custrecord_sti_cf_template_type', idTemplateType);

		data.save();
	}

	function check2ndTemplateType(idTemplateType) {

		var anotherTemplateType = '';

		var data = search.create({
			type: 'customrecord_sti_template_type',
			columns: ['internalid', 'custrecord_sti_tt_run_another_temp_type', 'custrecord_sti_tt_another_temp_type'],
			filters: [['internalid', 'is', idTemplateType], 'and', ['custrecord_sti_tt_run_another_temp_type', 'is', true]]
		});

		var myResultSet = data.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 1
		});

		log.debug('resultRange.length check2ndTemplateType', resultRange.length);

		if (resultRange.length > 0) {
			anotherTemplateType = resultRange[0].getValue({
				name: 'custrecord_sti_tt_another_temp_type'
			});
		}

		log.debug('anotherTemplateType', anotherTemplateType);

		return anotherTemplateType;

	}

	function checkRunJournal(idTemplateType) {

		var data = record.load({
			type: 'customrecord_sti_template_type',
			id: idTemplateType,
			isDynamic: true
		});

		return data.getValue('custrecord_sti_tt_run_journal');
	}


	function defineColumnHeader() {
		var columnsHeader = [];

		columnsHeader.push(search.createColumn('internalid'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_template_type'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_subsidiary'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_lender_type'));
		columnsHeader.push(search.createColumn({
			name: 'custrecord_sti_tj_sort_number',
			sort: search.Sort.ASC
		}));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_use_collect_bank_acc'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_use_tax_pph_acc_lender'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_use_direct_account'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_account'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_sign'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_source_mapping'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_description'));

		return columnsHeader;
	}

	function defineFilterHeader(templateType) {
		var filterHeader = [];

		filterHeader.push(search.createFilter({
			name: 'custrecord_sti_tj_template_type',
			operator: search.Operator.IS,
			values: templateType
		}));

		return filterHeader;
	}

	function getIdTransaction(transactionType) {
		if (transactionType == 1) {
			return 'customtransaction_sti_disbursement';
		}
		else if (transactionType == 2) {
			return 'customtransaction_sti_repayment';
		}
		else if (transactionType == 3) {
			return 'customtransaction_sti_discount';
		}
		else if (transactionType == 4) {
			return 'customtransaction_sti_cashback';
		}
		else if (transactionType == 5) {
			return 'customtransaction_sti_late_fee';
		}
		// else if (transactionType == 6){
		// 	return 'customtransaction_sti_refund';
		// }
		else {
			return '';
		}
	}

	function getTransactionDate(transaction_type, repayment_date, delivery_date) {
		if (transaction_type == 2 || transaction_type == 'repayment') {

			// return repayment_date;

			/*
				Update 06 Feb 2023 - Req by Bu Maya
				===================================
					Change Repayment Date to Process Date
		    
			*/
			var today = getToday_ASIA_BANGKOK()

			log.debug('today ' + typeof today, today);

			return today;
		}
		else if (
			// transaction_type == 1 || transaction_type == 'disbursed' || transaction_type == 'disbursement' ||
			transaction_type == 3 || transaction_type == 'discount' ||
			transaction_type == 4 || transaction_type == 'cashback' ||
			transaction_type == 5 || transaction_type == 'latefee'	// ||
			// transaction_type == 6 || transaction_type == 'refund'
		) {
			// return delivery_date;

			/*
				Update 06 Feb 2023 - Req by Bu Maya
				===================================
					Change Repayment Date to Process Date
		    
			*/
			var today = getToday_ASIA_BANGKOK()

			log.debug('today ' + typeof today, today);

			return today;
		}
		else if (
			transaction_type == 1 || transaction_type == 'disbursed' || transaction_type == 'disbursement'
		) {
			var today = getToday_ASIA_BANGKOK()

			log.debug('today ' + typeof today, today);

			return today;
		}
	}


	function getRepaymentDate(relatedStagingData) {

		var data = record.load({
			type: 'customrecord_sti_staging_data',
			id: relatedStagingData,
			isDynamic: true
		});

		log.debug('getRepaymentDate', data.getValue('custrecord_sti_repayment_date'));

		return data.getValue('custrecord_sti_repayment_date');
	}

	function getDeliveryDate(relatedStagingData) {

		var data = record.load({
			type: 'customrecord_sti_staging_data',
			id: relatedStagingData,
			isDynamic: true
		});

		log.debug('getDeliveryDate', data.getValue('custrecord_sti_delivery_date'));

		return data.getValue('custrecord_sti_delivery_date');
	}

	function getTemplateTypeSubsidiary(idTemplateType) {

		var data = record.load({
			type: 'customrecord_sti_template_type',
			id: idTemplateType,
			isDynamic: true
		});

		return data.getValue('custrecord_sti_tt_subsidiary');
	}

	function getPPHTaxLender(relatedStagingData) {
		var data = record.load({
			type: 'customrecord_sti_staging_data',
			id: relatedStagingData,
			isDynamic: true
		});

		var lender = data.getValue('custrecord_sti_lender');

		log.debug('lender getPPHTaxLender', lender);

		return getAccPPHTaxLender(lender);
	}

	function getAccPPHTaxLender(lender) {

		var account = '';
		var targetId = 'custentity_sti_pph_tax_account'

		var searchLender = search.create({
			type: search.Type.VENDOR,
			columns: ['internalid', 'entityid', targetId],
			filters: ['entityid', 'is', lender]
		});

		var myResultSet = searchLender.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 1
		});

		if (resultRange.length > 0) {
			account = resultRange[0].getValue({
				name: targetId
			});
		}

		log.debug('account getAccPPHTaxLender', account);

		return account;
	}

	function getTemplateJournalAccount(relatedStagingData, useCollectionBank, useTaxPPHLender, useDirectAccount, directAccount) {
		if (useCollectionBank) {

			log.debug('useCollectionBank');

			var data = getCollectionBank(relatedStagingData);

			log.debug('data', data);

			return getAccCollectionBank(data.collection_bank, data.collection_type);
		}
		else if (useTaxPPHLender) {

			log.debug('useTaxPPHLender');

			log.debug('getPPHTaxLender(relatedStagingData)', getPPHTaxLender(relatedStagingData));

			return getPPHTaxLender(relatedStagingData);
		}
		else if (useDirectAccount) {

			log.debug('useDirectAccount');
			log.debug('directAccount', directAccount);

			return directAccount;
		}
	}

	function getAccCollectionBank(collection_bank, collection_type) {
		var account = 0;
		var targetId = 'custrecord_sti_collection_bank_account'

		var searchCollectionBank = search.create({
			type: 'customrecord_sti_collection_bank',
			columns: ['internalid', 'name', 'custrecord_sti_collection_bank_account', 'custrecord_sti_collection_bank_type'],
			filters: [['name', 'is', collection_bank], 'and', ['custrecord_sti_collection_bank_type', 'is', collection_type], 'and', ['isinactive', 'is', false]]
		});

		var myResultSet = searchCollectionBank.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 1
		});

		if (resultRange.length > 0) {
			account = resultRange[0].getValue({
				name: targetId
			});
		}

		return account;
	}

	function getSourceMappingValueOld(newRecord, sourceMapping) {

		log.debug("sourceMapping "+typeof sourceMapping, sourceMapping);

		var B01 = newRecord.getValue('custrecord_sti_cf_b01');
		var B02 = newRecord.getValue('custrecord_sti_cf_b02');
		var B03 = newRecord.getValue('custrecord_sti_cf_b03');
		var B04 = newRecord.getValue('custrecord_sti_cf_b04');
		var B05 = newRecord.getValue('custrecord_sti_cf_b05');

		var B06 = newRecord.getValue('custrecord_sti_cf_b06');
		var B07 = newRecord.getValue('custrecord_sti_cf_b07');
		var B08 = newRecord.getValue('custrecord_sti_cf_b08');
		var B09 = newRecord.getValue('custrecord_sti_cf_b09');
		var B10 = newRecord.getValue('custrecord_sti_cf_b10');

		var B11 = newRecord.getValue('custrecord_sti_cf_b11');
		var B12 = newRecord.getValue('custrecord_sti_cf_b12');
		var B13 = newRecord.getValue('custrecord_sti_cf_b13');	// Add 06 May 2024
		var B14 = newRecord.getValue('custrecord_sti_cf_b14');	// Add 06 May 2024

		var R01 = newRecord.getValue('custrecord_sti_cf_r01');
		var R02 = newRecord.getValue('custrecord_sti_cf_r02');
		var R03 = newRecord.getValue('custrecord_sti_cf_r03');
		var R04 = newRecord.getValue('custrecord_sti_cf_r04');
		var R05 = newRecord.getValue('custrecord_sti_cf_r05');

		var R06 = newRecord.getValue('custrecord_sti_cf_r06');
		var R07 = newRecord.getValue('custrecord_sti_cf_r07');
		var R08 = newRecord.getValue('custrecord_sti_cf_r08');
		var R09 = newRecord.getValue('custrecord_sti_cf_r09');
		var R10 = newRecord.getValue('custrecord_sti_cf_r10');

		var R11 = newRecord.getValue('custrecord_sti_cf_r11');
		var R12 = newRecord.getValue('custrecord_sti_cf_r12');
		var R13 = newRecord.getValue('custrecord_sti_cf_r13');
		var R14 = newRecord.getValue('custrecord_sti_cf_r14');
		var R15 = newRecord.getValue('custrecord_sti_cf_r15');

		var R16 = newRecord.getValue('custrecord_sti_cf_r16');
		var R17 = newRecord.getValue('custrecord_sti_cf_r17');
		var R18 = newRecord.getValue('custrecord_sti_cf_r18');
		var R19 = newRecord.getValue('custrecord_sti_cf_r19');
		var R20 = newRecord.getValue('custrecord_sti_cf_r20');

		var R21 = newRecord.getValue('custrecord_sti_cf_r21');
		var R22 = newRecord.getValue('custrecord_sti_cf_r22');
		var R23 = newRecord.getValue('custrecord_sti_cf_r23');
		var R24 = newRecord.getValue('custrecord_sti_cf_r24');		// Add at 28 Aug 2022
		var R25 = newRecord.getValue('custrecord_sti_cf_r25');		// Add at 28 Aug 2022

		var R26 = newRecord.getValue('custrecord_sti_cf_r26');		// Add at 24 Oct 2022
		var R27 = newRecord.getValue('custrecord_sti_cf_r27');		// Add at 24 Oct 2022


		if (sourceMapping == 'B01') {
			return B01;
		}
		else if (sourceMapping == 'B02') {
			return B02;
		}
		else if (sourceMapping == 'B03') {
			return B03;
		}
		else if (sourceMapping == 'B04') {
			return B04;
		}
		else if (sourceMapping == 'B05') {
			return B05;
		}
		else if (sourceMapping == 'B06') {
			return B06;
		}
		else if (sourceMapping == 'B07') {
			return B07;
		}
		else if (sourceMapping == 'B08') {
			return B08;
		}
		else if (sourceMapping == 'B09') {
			return B09;
		}
		else if (sourceMapping == 'B10') {
			return B10;
		}
		else if (sourceMapping == 'B11') {
			return B11;
		}
		else if (sourceMapping == 'B12') {
			return B12;
		}
		else if (sourceMapping == 'B13') {
			return B13;
		}
		else if (sourceMapping == 'B14') {
			return B14;
		}
		else if (sourceMapping == 'R01') {
			return R01;
		}
		else if (sourceMapping == 'R02') {
			return R02;
		}
		else if (sourceMapping == 'R03') {
			return R03;
		}
		else if (sourceMapping == 'R04') {
			return R04;
		}
		else if (sourceMapping == 'R05') {
			return R05;
		}
		else if (sourceMapping == 'R06') {
			return R06;
		}
		else if (sourceMapping == 'R07') {
			return R07;
		}
		else if (sourceMapping == 'R08') {
			return R08;
		}
		else if (sourceMapping == 'R09') {
			return R09;
		}
		else if (sourceMapping == 'R10') {
			return R10;
		}
		else if (sourceMapping == 'R11') {
			return R11;
		}
		else if (sourceMapping == 'R12') {
			return R12;
		}
		else if (sourceMapping == 'R13') {
			return R13;
		}
		else if (sourceMapping == 'R14') {
			return R14;
		}
		else if (sourceMapping == 'R15') {
			return R15;
		}
		else if (sourceMapping == 'R16') {
			return R16;
		}
		else if (sourceMapping == 'R17') {
			return R17;
		}
		else if (sourceMapping == 'R18') {
			return R18;
		}
		else if (sourceMapping == 'R19') {
			return R19;
		}
		else if (sourceMapping == 'R20') {
			return R20;
		}
		else if (sourceMapping == 'R21') {
			return R21;
		}
		else if (sourceMapping == 'R22') {
			return R22;
		}
		else if (sourceMapping == 'R23') {
			return R23;
		}
		else if (sourceMapping == 'R24') {
			return R24;
		}
		else if (sourceMapping == 'R25') {
			return R25;
		}
		else if (sourceMapping == 'R26') {
			return R26;
		}
		else if (sourceMapping == 'R27') {
			return R27;
		}
		else {
			return 0;
		}
	}

	function roundTwo(number) {
		return parseFloat(parseFloat(number).toFixed(2));
	}

	function setJournalLine(JETransaction, idAccount, sign, amount, entity, memo) {

		JETransaction.selectNewLine({
			sublistId: 'line'
		});

		JETransaction.setCurrentSublistValue({
			sublistId: 'line',
			fieldId: 'account',
			value: idAccount
		});

		JETransaction.setCurrentSublistValue({
			sublistId: 'line',
			fieldId: sign,
			value: amount
		});

		JETransaction.setCurrentSublistValue({
			sublistId: 'line',
			fieldId: 'memo',
			value: memo
		});

		JETransaction.setCurrentSublistValue({
			sublistId: 'line',
			fieldId: 'entity',
			value: entity
		});

		JETransaction.commitLine({
			sublistId: 'line'
		});
	}

	function searchDataNeedToProcess(
		PAGE_SIZE,
		transactiontype,
		deliverydate,
		repaymentdate,
		loanid,
		suppliertransfer,
		lender,
		collectionbank,
		collectiontype
	) {

		var searchData = search.create({
			type: 'customrecord_sti_staging_data',
			columns: [
				'custrecord_sti_transaction_type',
				'custrecord_sti_loan_id',
				'custrecord_sti_delivery_date',
				'custrecord_sti_loan_amount',
				'custrecord_sti_repayment_date',
				'custrecord_sti_due_date_lender',
				'custrecord_sti_paid_amount',
				'custrecord_sti_discount',
				'custrecord_sti_cashback',
				'custrecord_sti_late_fee',
				'custrecord_sti_waive_fee',
				'custrecord_sti_lender',
				'custrecord_sti_supplier_transfer',
				'custrecord_sti_collection_bank',
				'custrecord_sti_collection_type'
			],
			filters:

				[
					[
						["custrecord_sti_message", "isempty", ""], "AND",
						["custrecord_sti_related_calc_formula", "anyof", "@NONE@"]
					], "AND",
					[
						[
							["custrecord_sti_transaction_type", "startswith", "disbursed"], "AND",
							["custrecord_sti_status_disbursement", "anyof", "2"]
						], "OR",
						[
							["custrecord_sti_transaction_type", "startswith", "disbursement"], "AND",
							["custrecord_sti_status_disbursement", "anyof", "2"]
						], "OR",
						[
							["custrecord_sti_transaction_type", "startswith", "repayment"], "OR",
							["custrecord_sti_transaction_type", "startswith", "discount"], "OR",
							["custrecord_sti_transaction_type", "startswith", "cashback"], "OR",
							["custrecord_sti_transaction_type", "startswith", "latefee"] //,"OR",
							// ["custrecord_sti_transaction_type","startswith","refund"]				// Add 19 Jun 2023
						]
					]
				]
		});


		var filters = searchData.filters;

		if (deliverydate == '') {

		} else {
			var filterOne = search.createFilter({
				name: 'custrecord_sti_delivery_date',
				operator: 'is',
				values: deliverydate
			});

			filters.push(filterOne);
		}

		if (suppliertransfer != '') {

			log.debug('add filter suppliertransfer');

			var filterTwo = search.createFilter({
				name: 'custrecord_sti_supplier_transfer',
				operator: search.Operator.IS,
				values: suppliertransfer
			});

			filters.push(filterTwo);
		}

		if (lender != '') {

			log.debug('add filter lender');

			var filterThree = search.createFilter({
				name: 'custrecord_sti_lender',
				operator: search.Operator.IS,
				values: lender
			});

			filters.push(filterThree);
		}

		if (loanid != '') {

			log.debug('add filter loanID');

			var filterFour = search.createFilter({
				name: 'custrecord_sti_loan_id',
				operator: search.Operator.IS,
				values: loanid
			});

			filters.push(filterFour);
		}

		if (transactiontype != '') {

			log.debug('add filter transactionType');

			var filterFive = search.createFilter({
				name: 'custrecord_sti_transaction_type',
				operator: search.Operator.IS,
				values: transactiontype
			});

			filters.push(filterFive);
		}

		if (repaymentdate != '') {

			log.debug('add filter repaymentDate');

			var filterSix = search.createFilter({
				name: 'custrecord_sti_repayment_date',
				operator: search.Operator.IS,
				values: repaymentdate
			});

			filters.push(filterSix);
		}

		if (collectionbank != '') {

			log.debug('add filter collectionbank');

			var filterSeven = search.createFilter({
				name: 'custrecord_sti_collection_bank',
				operator: search.Operator.IS,
				values: collectionbank
			});

			filters.push(filterSeven);
		}

		if (collectiontype != '') {

			log.debug('add filter collectiontype');

			var filterEight = search.createFilter({
				name: 'custrecord_sti_collection_type',
				operator: search.Operator.IS,
				values: collectiontype
			});

			filters.push(filterEight);
		}


		log.debug('filters', filters);

		return searchData.runPaged({
			pageSize: PAGE_SIZE
		});
	}

	function runSSNeedtoProcess(SEARCH_ID, PAGE_SIZE, transactiontype, deliverydate, repaymentdate, loanid, suppliertransfer, lender) {

		log.debug('SEARCH_ID', typeof SEARCH_ID + ' ' + SEARCH_ID);
		log.debug('PAGE_SIZE', typeof PAGE_SIZE + ' ' + PAGE_SIZE);
		log.debug('deliverydate', typeof deliverydate + ' ' + deliverydate);
		log.debug('loanid', typeof loanid + ' ' + loanid);
		log.debug('suppliertransfer', typeof suppliertransfer + ' ' + suppliertransfer);
		log.debug('lender', typeof lender + ' ' + lender);

		var searchObj = search.load({
			id: SEARCH_ID
		});

		var filters = searchObj.filters; //reference Search.filters object to a new variable


		if (deliverydate != '') {

			var filterOne = search.createFilter({ //create new filter
				name: 'custrecord_sti_delivery_date',
				operator: search.Operator.IS,
				values: deliverydate
			});

			filters.push(filterOne); //add the filter using .push() method
		}

		if (suppliertransfer != '') {

			log.debug('add filter suppliertransfer');

			var filterTwo = search.createFilter({ //create new filter
				name: 'custrecord_sti_supplier_transfer',
				operator: search.Operator.IS,
				values: suppliertransfer
			});

			filters.push(filterTwo); //add the filter using .push() method
		}

		if (lender != '') {

			log.debug('add filter lender');

			var filterThree = search.createFilter({ //create new filter
				name: 'custrecord_sti_lender',
				operator: search.Operator.IS,
				values: lender
			});

			filters.push(filterThree); //add the filter using .push() method
		}

		if (loanid != '') {

			log.debug('add filter loanid');

			var filterFour = search.createFilter({ //create new filter
				name: 'custrecord_sti_loan_id',
				operator: search.Operator.IS,
				values: loanid
			});

			filters.push(filterFour); //add the filter using .push() method
		}

		if (transactiontype != '') {

			log.debug('add filter transactiontype');

			var filterFive = search.createFilter({ //create new filter
				name: 'custrecord_sti_transaction_type',
				operator: search.Operator.IS,
				values: transactiontype
			});

			filters.push(filterFive); //add the filter using .push() method
		}

		if (repaymentdate != '') {

			log.debug('add filter repaymentdate');

			var filterSix = search.createFilter({ //create new filter
				name: 'custrecord_sti_repayment_date',
				operator: search.Operator.IS,
				values: repaymentdate
			});

			filters.push(filterSix); //add the filter using .push() method
		}

		return searchObj.runPaged({
			pageSize: PAGE_SIZE
		});
	}

	function searchDataPendingDisbursement(
		PAGE_SIZE,
		deliverydate,
		loanid,
		suppliertransfer,
		lender,
		customername,
		suppliername,
		storename,
		facilitytype,
		region
	) {

		var searchData = search.create({
			type: "customrecord_sti_staging_data",
			filters:
				[
					["custrecord_sti_transaction_type", "startswith", "disbursement"],
					"AND",
					["custrecord_sti_status_disbursement", "anyof", "1"],
					"AND",
					["custrecord_sti_related_calc_formula", "anyof", "@NONE@"],
					"AND",
					["custrecord_sti_message", "isempty", ""]
				],
			columns:
				[
					search.createColumn({
						name: "internalid",
						sort: search.Sort.ASC,
						label: "Internal ID"
					}),
					search.createColumn({ name: "custrecord_sti_transaction_type", label: "transaction_type" }),
					search.createColumn({ name: "custrecord_sti_delivery_date", label: "delivery_date" }),
					search.createColumn({ name: "custrecord_sti_trx_id", label: "trx_id" }),
					search.createColumn({ name: "custrecord_sti_loan_id", label: "loan_id" }),
					search.createColumn({ name: "custrecord_sti_loan_amount", label: "loan_amount" }),
					search.createColumn({ name: "custrecord_sti_supplier_transfer", label: "supplier_transfer" }),
					search.createColumn({ name: "custrecord_sti_discount", label: "discount" }),
					search.createColumn({ name: "custrecord_sti_cashback", label: "cashback" }),
					search.createColumn({ name: "custrecord_sti_status_disbursement", label: "status_disbursement" }),
					search.createColumn({ name: "custrecord_sti_lender", label: "lender" }),

					// Add at 27 Sept 2022
					search.createColumn({ name: "custrecord_sti_customer_id", label: "customer_id" }),
					search.createColumn({ name: "custrecord_sti_full_name", label: "full_name" }),
					search.createColumn({ name: "custrecord_sti_amount_to_finance", label: "amount_to_finance" }),	// disbursement will look up to amount_to_finance
					search.createColumn({ name: "custrecord_sti_supplier_name", label: "supplier_name" }),
					search.createColumn({ name: "custrecord_sti_store_name", label: "store_name" }),
					search.createColumn({ name: "custrecord_sti_facility_type", label: "facility_type" }),

					// Add at 3 Oct 2022
					search.createColumn({ name: "custrecord_sti_region", label: "region" })
				]
		});

		var filters = searchData.filters;

		if (deliverydate == '') {

		} else {
			var filterOne = search.createFilter({
				name: 'custrecord_sti_delivery_date',
				operator: 'is',
				values: deliverydate
			});

			filters.push(filterOne);
		}

		if (loanid == '') {

		} else {
			var filterTwo = search.createFilter({
				name: 'custrecord_sti_loan_id',
				operator: 'is',
				values: loanid
			});

			filters.push(filterTwo);
		}

		if (suppliertransfer == '') {

		} else {
			var filterThree = search.createFilter({
				name: 'custrecord_sti_supplier_transfer',
				operator: 'is',
				values: suppliertransfer
			});

			filters.push(filterThree);
		}

		if (lender == '') {

		} else {
			var filterFour = search.createFilter({
				name: 'custrecord_sti_lender',
				operator: 'is',
				values: lender
			});

			filters.push(filterFour);
		}

		if (customername == '') {

		} else {
			var filterFive = search.createFilter({
				name: 'custrecord_sti_full_name',
				operator: 'is',
				values: customername
			});

			filters.push(filterFive);
		}

		if (suppliername == '') {

		} else {
			var filterSix = search.createFilter({
				name: 'custrecord_sti_supplier_name',
				operator: 'is',
				values: suppliername
			});

			filters.push(filterSix);
		}

		if (storename == '') {

		} else {
			var filterSeven = search.createFilter({
				name: 'custrecord_sti_store_name',
				operator: 'is',
				values: storename
			});

			filters.push(filterSeven);
		}

		if (facilitytype == '') {

		} else {
			var filterEight = search.createFilter({
				name: 'custrecord_sti_facility_type',
				operator: 'is',
				values: facilitytype
			});

			filters.push(filterEight);
		}

		if (region == '') {

		} else {
			var filterNine = search.createFilter({
				name: 'custrecord_sti_region',
				operator: 'is',
				values: region
			});

			filters.push(filterNine);
		}

		return searchData.runPaged({
			pageSize: PAGE_SIZE
		});

	}

	function getNumber(number) {

		if (number == '') {

			return 0;

		} else {

			if (isNaN(number)) {
				return 0;
			} else {
				return parseFloat(number);
			}

		}
	}

	function getTemplateType(template_type) {
		var searchRecord = search.create({
			type: 'customrecord_sti_template_type',
			columns: ['name', 'internalid'],
			filters: [['name', 'is', template_type], 'and', ['isinactive', 'is', false]]
		});

		var myResultSet = searchRecord.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 1
		});

		if (resultRange.length > 0) {

			return resultRange[0].getValue('internalid');

		} else {
			return 0;
		}
	}

	function getTransactionType(transaction_type) {
		var searchRecord = search.create({
			type: 'customlist_sti_trans_type_staging_data',
			columns: ['name', 'internalid'],
			filters: [['name', 'is', transaction_type], 'and', ['isinactive', 'is', false]]
		});

		var myResultSet = searchRecord.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 1
		});

		if (resultRange.length > 0) {

			return parseInt(resultRange[0].getValue('internalid'));

		} else {
			return 0;
		}
	}

	function getStagingData(id_staging, suffixBillingCycle, prefixSupplierTransfer) {

		var data = record.load({
			type: 'customrecord_sti_staging_data',
			id: id_staging,
			isDynamic: true
		});



		var transaction_type = data.getValue('custrecord_sti_transaction_type');
		var loan_id = data.getValue('custrecord_sti_loan_id');
		var lender = data.getValue('custrecord_sti_lender');
		var id_lender = getLenderId(lender);
		var delivery_date = data.getValue('custrecord_sti_delivery_date');
		var repayment_date = data.getValue('custrecord_sti_repayment_date');

		// Add 05 Jan 2025 > for maintain reference date based on custom preference
		var map_param_date = {
			'current_date' : getToday_ASIA_BANGKOK(),
			'delivery_date' : delivery_date,
			'repayment_date' : repayment_date
		}

		// Find Collection Bank
		var collection_bank = data.getValue('custrecord_sti_collection_bank');
		var collection_type = data.getValue('custrecord_sti_collection_type');

		var collection_account = 0;

		if (collection_bank != '' && collection_type != '') {
			collection_account = getAccCollectionBank(collection_bank, collection_type);
		}

		var data_repayment = new Object();

		if (transaction_type == 'latefee') {
			data_repayment = getRepaymentInfo(loan_id, delivery_date);

			if (data_repayment.collection_bank != '') {
				collection_bank = data_repayment.collection_bank;
			}

			if (data_repayment.collection_type != '') {
				collection_type = data_repayment.collection_type;
			}

			collection_account = getAccCollectionBank(collection_bank, collection_type);
		}


		var transaction_date = getTransactionDate(transaction_type, repayment_date, delivery_date);
		// add 20 March 2024 for get Lender Penalty Rate
		var due_date_lender = data.getValue('custrecord_sti_due_date_lender');

		log.debug('transaction_type ' + typeof transaction_type, transaction_type);
		log.debug('lender ' + typeof lender, lender);
		log.debug('id_lender ' + typeof id_lender, id_lender);
		log.debug('delivery_date ' + typeof delivery_date, delivery_date);
		log.debug('repayment_date ' + typeof repayment_date, repayment_date);
		log.debug('transaction_date ' + typeof transaction_date, transaction_date);

		var date_ppn_rate = mappingParamDate(PARAM_DATE.ppn_rate, map_param_date);
		var ppn_rate = getEffectivePPNRate(date_ppn_rate);

		var date_lender_interest_rate = mappingParamDate(PARAM_DATE.lender_interest_rate, map_param_date);
		var lender_interest_rate = getEffectiveLenderInterestRate(id_lender, date_lender_interest_rate);

		var lender_penalty_rate = 0;
		
		//if (transaction_type == "repayment"){
		
		log.debug("data_repayment "+typeof data_repayment, data_repayment);

		if (transaction_type == "latefee"){
			lender_penalty_rate = getEffectiveLenderPenaltyRate(id_lender, data_repayment.due_date_lender);
		}
		
		var date_lender_grace_period = mappingParamDate(PARAM_DATE.grace_period, map_param_date);
		var lender_grace_period = getEffectiveLenderGracePeriod(id_lender, date_lender_grace_period);

		var date_lender_pph_tax_rate = mappingParamDate(PARAM_DATE.lender_pph_tax_rate, map_param_date);
		var lender_pph_tax_rate = getEffectiveLenderPPHTaxRate(id_lender, date_lender_pph_tax_rate);

		/*
			#Update 23 March 2024 | Req by Bu Maya
			Change lender_interest_rate from by transaction_date to delivery_date
			Change lender_penalty_rate from by transaction_date to due_date_lender
		*/


		var repayment_amount_expected = 0;

		var transaction_type = data.getValue('custrecord_sti_transaction_type');

		if (transaction_type === 'repayment') {

			var repayment_id_staging = id_staging;
			var amount_expected = getNumber(data.getValue('custrecord_sti_repayment_amount_expected'));
			var loan_id = data.getValue('custrecord_sti_loan_id');
			var repayment_date = data.getValue('custrecord_sti_repayment_date');

			repayment_amount_expected = getRepaymentAmountExpected(
				repayment_id_staging,
				amount_expected,
				loan_id,
				repayment_date
			);
		}

		// ====================
		// EXTRACT STAGING_DATA
		// ====================

		var data_staging = {
			'id_staging': id_staging,
			'subsidiary': main_subsidiary,
			'transaction_type': data.getValue('custrecord_sti_transaction_type'),
			'template_type': data.getValue('custrecord_sti_template_type'),
			'trx_id': data.getValue('custrecord_sti_trx_id'),
			'loan_id': data.getValue('custrecord_sti_loan_id'),
			'customer_id': data.getValue('custrecord_sti_customer_id'),
			'full_name': data.getValue('custrecord_sti_full_name'),
			'loan_created_date': data.getValue('custrecord_sti_loan_created_date'),
			'amount_to_finance': getNumber(data.getValue('custrecord_sti_amount_to_finance')),
			'interest_fee': getNumber(data.getValue('custrecord_sti_interest_fee')),
			'discount_type': data.getValue('custrecord_sti_discount_type'),		// Add at 21 Nov 2022 (value discount_load | discount_repayment)
			'discount': getNumber(data.getValue('custrecord_sti_discount')),
			'cashback': getNumber(data.getValue('custrecord_sti_cashback')),
			'expected_cashback_amount': getNumber(data.getValue('custrecord_sti_exp_cashback_amt')),
			'rounding_amount': getNumber(data.getValue('custrecord_sti_rounding_amount')),
			'loan_amount': getNumber(data.getValue('custrecord_sti_loan_amount')),
			'status_disbursement': data.getValue('custrecord_sti_status_disbursement'),			// Added Condition for Disbursement
			'repayment_date_expected': data.getValue('custrecord_sti_repayment_date_expected'),
			'repayment_amount_expected': repayment_amount_expected,	// its O6
			'penalty': data.getValue('custrecord_sti_penalty'),					// NO_MAP
			'repayment_date': data.getValue('custrecord_sti_repayment_date'),
			'paid_amount': getNumber(data.getValue('custrecord_sti_paid_amount')),
			'due_date_lender': data.getValue('custrecord_sti_due_date_lender'),
			'late_fee': getNumber(data.getValue('custrecord_sti_late_fee')),
			'waive_fee': getNumber(data.getValue('custrecord_sti_waive_fee')),
			'remaining_or_over': data.getValue('custrecord_sti_remaining_or_over'),
			'billing_cycle': data.getValue('custrecord_sti_billing_cycle'),
			'interest_rate': getNumber(data.getValue('custrecord_sti_interest_rate')),
			'facility_type': data.getValue('custrecord_sti_facility_type'),
			'lender': data.getValue('custrecord_sti_lender'),
			'supplier_transfer': data.getValue('custrecord_sti_supplier_transfer'),
			'delivery_date': data.getValue('custrecord_sti_delivery_date'),
			'supplier_name': data.getValue('custrecord_sti_supplier_name'),
			'beneficiary_bank': data.getValue('custrecord_sti_beneficiary_bank'),
			'bank_code': data.getValue('custrecord_sti_bank_code'),
			'beneficiary_account_no': data.getValue('custrecord_sti_beneficiary_account_no'),
			'beneficiary_name': data.getValue('custrecord_sti_beneficiary_name'),
			'sales_code': data.getValue('custrecord_sti_sales_code'),
			'sales_name': data.getValue('custrecord_sti_sales_name'),
			'product': data.getValue('custrecord_sti_product'),
			'region': data.getValue('custrecord_sti_region'),
			'tribe': data.getValue('custrecord_sti_tribe'),
			'collection_bank': collection_bank,
			'collection_type': collection_type,
			'collection_account': collection_account,
			'created_date_time': data.getValue('custrecord_sti_created_date_time'),
			'sync_status': data.getValue('custrecord_sti_sync_status'),
			'sync_date_time': data.getValue('custrecord_sti_sync_date_time'),
			'batch_id': data.getValue('custrecord_sti_batch_id'),
			'process_date': data.getValue('custrecord_sti_process_date'),
			'relatedTransaction': data.getValue('custrecord_sti_related_transaction'),
			'message': data.getValue('custrecord_sti_message'),
			'suffixBillingCycle': suffixBillingCycle,
			'prefixSupplierTransfer': prefixSupplierTransfer,
			'ppn_rate': ppn_rate,
			'lender_interest_rate': lender_interest_rate,
			'lender_penalty_rate': lender_penalty_rate,
			'lender_grace_period': lender_grace_period,
			'lender_pph_tax_rate': lender_pph_tax_rate,
			// 'overpayment'				: getNumber(data.getValue('custrecord_sti_overpayment')), // Add at 26 Apr 2023
			// 'refund'					: getNumber(data.getValue('custrecord_sti_refund')) // Add at 19 Jun 2023
		};


		return JSON.stringify(data_staging);
	}

	function validationData(param) {

		var data = JSON.parse(param);

		var tempError = [];

		log.debug('data ' + typeof data, data);

		log.debug('data.transaction_type', typeof data.transaction_type + ' ' + data.transaction_type);

		tempError = validationTransType(data.transaction_type, data.template_type);

		if (tempError.length > 0) {

			var errorMessage = extractError(tempError);

			setErrorMessage(data.id_staging, errorMessage);

		}
		else {

			tempError = validationLender(data.lender);

			if (tempError.length > 0) {

				var errorMessage = extractError(tempError);

				setErrorMessage(data.id_staging, errorMessage);

			}

			else {

				tempError = validationDetail(data);

				if (tempError.length > 0) {

					var errorMessage = extractError(tempError);

					setErrorMessage(data.id_staging, errorMessage);

				}
			}
		}

		log.debug('tempError', tempError);

		return tempError;
	}

	function validationTransType(transaction_type, template_type) {

		var tempError = [];

		if (getTransactionType(transaction_type) == 0) {
			tempError.push('transaction_type ' + transaction_type + ' not defined yet, please set to ' + getAvailableTransactionType());
		}


		// if (getTemplateType(template_type) == 0){
		// tempError.push('template_type '+template_type+' not defined yet, please check template_type record');
		// }else{
		// if (!checkTemplateJournal(template_type)){
		// tempError.push('template_journal for template_type '+template_type+' not defined yet, please check template_journal record');
		// }
		// }

		return tempError;
	}

	function validationLender(lender) {

		var tempError = [];

		if (!checkLender(lender)) {
			tempError.push('Lender ' + lender + ' not found');
		}
		else {
			var lenderId = getLenderId(lender);

			var masterLender = record.load({
				type: record.Type.VENDOR,
				id: lenderId,
				isDynamic: true,
			});

			/*	LENDER INFORMATION	*/

			var lenderType = masterLender.getValue('custentity_sti_lender_type');

			if (lenderType == '') {
				tempError.push('lenderType ' + lender + ' is empty');
			}

			var pphTaxAccount = masterLender.getValue('custentity_sti_pph_tax_account');

			if (pphTaxAccount == '') {
				tempError.push('pphTaxAccount ' + lender + ' is empty');
			}

			/*
				21 Oct 2022
				lenderInterestRate | lenderPenaltyRate | gracePeriod | pphTaxRate
				already setting based on effective date (another custom record)
			*/

			/* var lenderInterestRate = masterLender.getValue('custentity_sti_lender_interest_rate');
		    
			if (lenderInterestRate == ''){
				tempError.push('lenderInterestRate '+lender+' is empty');
			}else{
				if (isNaN(lenderInterestRate)){
					tempError.push(lender+' lenderInterestRate cannot be NaN');
				}
			} */

			/* var lenderPenaltyRate = masterLender.getValue('custentity_sti_lender_penalty_rate');
		    
			if (lenderPenaltyRate === ''){
				tempError.push('lenderPenaltyRate '+lender+' is empty');
			}else{
				if (isNaN(lenderPenaltyRate)){
					tempError.push(lender+' lenderPenaltyRate cannot be NaN');
				}
			} */

			/* var gracePeriod = masterLender.getValue('custentity_sti_grace_period');
		    
			if (gracePeriod === ''){
				tempError.push('gracePeriod '+lender+' is empty');
			}else{
				if (isNaN(gracePeriod)){
					tempError.push(lender+' gracePeriod cannot be NaN');
				}
			} */

			/* var pphTaxRate = masterLender.getValue('custentity_sti_pph_tax_rate');
		    
			if (pphTaxRate === ''){
				tempError.push('pphTaxRate '+lender+' is empty');
			} */
		}

		return tempError;
	}

	function validationDetail(data) {

		var tempError = [];

		// VALIDATION GENERAL
		// ==================

		// trx_id not defined yet

		if (data.loan_id == '') {
			tempError.push('loan_id cannot be empty');
		}

		// if (data.customer_id == ''){
		// tempError.push('customer_id cannot be empty');
		// }

		// full_name not defined yet

		// I think loadn_created_date no need
		/* if (data.loan_created_date != ''){
			if (moment(data.loan_created_date, 'M/D/YYYY',true).isValid() == false){
				tempError.push('loan_created_date must with format MM/DD/YYYY');
			}else{
				// Check active ACCOUNTING_PERIOD
			    
				if (!validationAccountingPeriod(data.loan_created_date)){
					tempError.push('Accounting Period on loan_created_date '+data.loan_created_date+' is locked or not found');
				}
			}
		} */

		if (isNaN(data.amount_to_finance)) {
			tempError.push('amount_to_finance cannot be NaN');
		}

		if (isNaN(data.interest_fee)) {
			tempError.push('interest_fee cannot be NaN');
		}

		if (data.transaction_type == 'discount') {
			if (isNaN(data.discount)) {
				tempError.push('discount cannot be NaN');
			}
		}

		if (data.transaction_type == 'cashback') {
			if (isNaN(data.cashback)) {
				tempError.push('cashback cannot be NaN');
			}
		}

		// rounding_amount not defined yet

		if (isNaN(data.loan_amount)) {
			tempError.push('loan_amount cannot be NaN');
		}

		// repayment_date_expected not defined yet

		if (isNaN(data.repayment_amount_expected)) {
			tempError.push('repayment_amount_expected cannot be NaN');
		}

		// penalty not defined yet

		if (data.transaction_type == 'repayment') {
			if (data.repayment_date == '') {
				tempError.push('repayment_date cannot be empty');
			} else {
				if (moment(data.repayment_date, 'M/D/YYYY', true).isValid() == false) {
					tempError.push('repayment_date must with format MM/DD/YYYY');
				} else {
					// Check active ACCOUNTING_PERIOD

					if (!validationAccountingPeriod(data.repayment_date)) {
						tempError.push('Accounting Period on repayment_date ' + data.repayment_date + ' is locked or not found');
					}
				}
			}

			if (isNaN(data.paid_amount)) {
				tempError.push('paid_amount cannot be NaN');
			}

			if (data.due_date_lender == '') {
				tempError.push('due_date_lender cannot be empty');
			} else {
				if (moment(data.due_date_lender, 'M/D/YYYY', true).isValid() == false) {
					tempError.push('due_date_lender must with format MM/DD/YYYY');
				} else {
					// Check active ACCOUNTING_PERIOD

					if (!validationAccountingPeriod(data.due_date_lender)) {
						tempError.push('Accounting Period on due_date_lender ' + data.due_date_lender + ' is locked or not found');
					}
				}
			}
		}

		if (data.transaction_type == 'latefee') {
			if (isNaN(data.late_fee)) {
				tempError.push('late_fee cannot be NaN');
			}

			if (isNaN(data.waive_fee)) {
				tempError.push('waive_fee cannot be NaN');
			}

			var data_repayment = getRepaymentInfo(data.loan_id, data.delivery_date);

			if (data_repayment.collection_bank == '') {
				tempError.push('collection_bank at repayment reference is blank');
			}

			if (data_repayment.collection_type == '') {
				tempError.push('collection_type at repayment reference is blank');
			}
		}

		// remaining_or_over not defined yet

		// if (!validationBillingCycleFormat(data.billing_cycle, data.suffixBillingCycle)){
		// tempError.push('billing_cycle format must be ##'+data.suffixBillingCycle);
		// }

		if (isNaN(data.interest_rate)) {
			tempError.push('interest_rate cannot be NaN');
		}

		// facility_type not defined yet

		log.debug('data.prefixSupplierTransfer ' + typeof data.prefixSupplierTransfer, data.prefixSupplierTransfer);

		if (!validationSupplierTransferFormat(data.supplier_transfer, data.prefixSupplierTransfer)) {
			tempError.push('supplier_transfer format must be ' + prefixSupplierTransfer + '##');
		}

		if (data.transaction_type != 'repayment') {

			// delivery_date used for date except Repayment Transaction

			log.debug('check delivery date ' + typeof data.delivery_date, data.delivery_date);

			if (data.delivery_date != '') {
				if (moment(data.delivery_date, 'M/D/YYYY', true).isValid() == false) {
					tempError.push('delivery_date must with format MM/DD/YYYY');
				} else {

					// var workingDate = getWorkingDay(data.delivery_date, data.supplier_transfer, data.prefixSupplierTransfer);

					// Check active ACCOUNTING_PERIOD

					if (!validationAccountingPeriod(data.delivery_date)) {
						tempError.push('Accounting Period on delivery_date ' + data.delivery_date + ' is locked or not found (getWorkingDay(delivery_date))');
					}
				}
			} else {
				tempError.push('delivery_date cannot be empty');
			}

			log.debug('check tempError ' + typeof tempError, tempError);
			log.debug('end check delivery date');
		}

		// supplier_name not defined yet

		// beneficiary_bank not defined yet

		// bank_code not defined yet

		// beneficiary_account_no not defined yet

		// sales_code not defined yet

		// sales_name not defined yet

		// product not defined yet

		// region not defined yet

		// tribe not defined yet

		if (data.transaction_type == 'repayment') {
			if (data.collection_bank == '' || data.collection_type == '') {
				tempError.push('collection_bank and collection_type cannot be empty');
			} else {
				if (getAccCollectionBank(data.collection_bank, data.collection_type) == 0) {
					tempError.push('collection_bank ' + data.collection_bank + '[' + data.collection_type + '] not Found on Collection Bank Record');
				}
			}
		}



		return tempError;
	}

	function checkLender(lender) {
		var searchLender = search.create({
			type: search.Type.VENDOR,
			columns: ['entityid'],
			filters: [['entityid', 'is', lender], 'and', ['custentity_sti_is_lender', 'is', true], 'and', ['isinactive', 'is', false]]
		});

		var myResultSet = searchLender.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 1
		});

		if (resultRange.length > 0) {
			return true;
		} else {
			return false;
		}
	}

	function extractError(tempError) {
		var error = '';

		if (tempError.length > 0) {
			for (var i = 0; i < tempError.length; i++) {

				if (error == '') {
					error = tempError[i];
				} else {
					error = error + ' | ' + tempError[i];
				}

			}
		}

		var errorMsg = error.substring(0, 1000); // Limit Text Area

		return errorMsg;
	}

	function validationAccountingPeriod(date) {

		const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

		const d = new Date(date);
		var nameMonth = month[d.getMonth()];
		var nameYear = d.getFullYear();

		var period = nameMonth + ' ' + nameYear;

		var searchPeriod = search.create({
			type: search.Type.ACCOUNTING_PERIOD,
			columns: ['periodname', 'aplocked', 'arlocked', 'alllocked'],
			filters: [['periodname', 'is', period], 'and', ['aplocked', 'is', false], 'and', ['arlocked', 'is', false]]
		});

		var myResultSet = searchPeriod.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 1
		});

		if (resultRange.length > 0) {
			return true;
		} else {
			return false;
		}

	}

	function validationBillingCycleFormat(billing_cycle, suffixBillingCycle) {

		if (billing_cycle.slice(-2) != suffixBillingCycle) {
			return false;
		} else {
			return true;
		}
	}

	function validationSupplierTransferFormat(supplier_transfer, prefixSupplierTransfer) {

		if (supplier_transfer.substring(0, 2) != prefixSupplierTransfer) {
			return false;
		} else {
			return true;
		}
	}

	function getWorkingDay(date, supplier_transfer, prefixSupplierTransfer) {

		var transferDay = parseFloat(supplier_transfer.replace(prefixSupplierTransfer, ''));

		if (transferDay > 0) {

			var tempDate = format.parse({
				value: date,
				type: format.Type.DATE
			});

			tempDate.setDate(tempDate.getDate() + transferDay);

			var transferDate = format.format({
				value: tempDate,
				type: format.Type.DATE
			});

			date = transferDate;

			while (isWeekEnd(date) || isHoliday(date)) {

				var tempDate = format.parse({
					value: date,
					type: format.Type.DATE
				});

				tempDate.setDate(tempDate.getDate() + 1);

				var nextDate = format.format({
					value: tempDate,
					type: format.Type.DATE
				});

				date = nextDate;

				log.debug('date', typeof date + ' ' + date);
			}
		}

		return date;
	}

	function setErrorMessage(internalID, errorMsg) {

		var mStaging = record.load({
			type: 'customrecord_sti_staging_data',
			id: internalID,
			isDynamic: true,
		});

		mStaging.setValue('custrecord_sti_message', errorMsg);
		mStaging.save();

		return true;
	}

	function getLenderInformation(lender) {

		var searchLender = search.create({
			type: search.Type.VENDOR,
			columns: [
				'internalid',
				'entityid',
				'custentity_sti_lender_type',
				'custentity_sti_pph_tax_account',
				'custentity_sti_len_acc_coa'
			],
			filters: [['entityid', 'is', lender], 'and', ['isinactive', 'is', false]]
		});

		var myResultSet = searchLender.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 1
		});

		var data = new Array();

		if (resultRange.length > 0) {
			var internalid = resultRange[0].getValue({
				name: 'internalid'
			});
			var entityid = resultRange[0].getValue({
				name: 'entityid'
			});
			var type = resultRange[0].getValue({
				name: 'custentity_sti_lender_type'
			});
			var pph_tax_account = resultRange[0].getValue({
				name: 'custentity_sti_pph_tax_account'
			});
			var len_acc_coa = resultRange[0].getValue({
				name: 'custentity_sti_len_acc_coa'
			});

			data.push({
				'internalid': parseInt(internalid),
				'entityid': entityid,
				'type': parseInt(type),
				'pph_tax_account': parseInt(pph_tax_account),
				'len_acc_coa' : parseInt(len_acc_coa)
			});
		}
		else {

			data.push({
				'internalid': '',
				'entityid': '',
				'type': '',
				'pph_tax_account': '',
				'len_acc_coa' : ''
			});
		}

		log.debug('getLenderInformation data ' + typeof data, data);

		return JSON.stringify(data);
	}

	function getInterestToLender(B05_Principal_Amount, billing_cycle, suffixBillingCycle, B03_Lender_Interest_Rate) {

		var billing_cycleDay = parseFloat(billing_cycle.replace(suffixBillingCycle, ''));

		var interestToLender = B05_Principal_Amount * ((billing_cycleDay / 360) * B03_Lender_Interest_Rate);

		return interestToLender;
	}

	function getRepaymentPrinciple(
		paid_amount,
		loan_amount,
		discount,
		cashback,
		amount_to_finance,
		interest_fee,
		rounding_amount,
		repayment_amount_expected,
		late_fee
	) {

		var repaymentPrinciple = 0;

		var cleanAmount = (loan_amount - discount - cashback);

		if (paid_amount < repayment_amount_expected) {	// Update 20 Oct 2022

			log.debug('calculate getRepaymentPrinciple');
			repaymentPrinciple = (amount_to_finance / repayment_amount_expected) * (paid_amount + cashback - late_fee);	// Update 21 Nov 2022
			// repaymentPrinciple = (amount_to_finance / (amount_to_finance + interest_fee + rounding_amount)) * (paid_amount + discount + cashback - late_fee);	// Update 08 Nov 2022
			// repaymentPrinciple = (amount_to_finance / (amount_to_finance + interest_fee + rounding_amount)) * (paid_amount + discount + cashback);	// Update 04 Oct 2022
			// repaymentPrinciple = (amount_to_finance / (amount_to_finance + interest_fee)) * (paid_amount + discount + cashback);
		} else {
			log.debug('amount_to_finance getRepaymentPrinciple');
			repaymentPrinciple = amount_to_finance;
		}

		log.debug('repaymentPrinciple ' + typeof repaymentPrinciple, repaymentPrinciple);

		return repaymentPrinciple;

		/*
			P2 = paid_amount
			N2 = loan_amount
			J2 = discount
			K2 = cashback
			E2 = amount_to_finance
			I2 = interest_fee
			U2 = round_amount
			O2/O6 = repayment_amount_expected
			L2 = late_fee
	   
			Update Formula at 21 Nov 2022
			=============================
			=IF(P2<O6,(E2/O6)*(P2+K2-IF(L2>0,L2,0)),E2)
	   
			Update Formula at 08 Nov 2022
			=============================
			=IF(P2<O6,(E2/(E2+I2+U2))*(P2+J2+K2-IF(L2>0,L2,0)),E2)
	   
			Update Formula at 20 Oct 2022
			=============================
			=IF(P2<O2,(E2/(E2+I2+U2))*(P2+J2+K2),E2)
	   
			Update Formula at 04 Oct 2022
			=============================
			=IF(P2<=(N2-J2-K2),(E2/(E2+I2+U2))*(P2+J2+K2),E2)
		*/
	}

	function getRepaymentInterest(
		paid_amount,
		loan_amount,
		discount,
		cashback,
		amount_to_finance,
		interest_fee,
		rounding_amount,
		repayment_amount_expected,
		late_fee,
		discount_repayment
	) {

		var repaymentInterest = 0;

		var clean_amount = (loan_amount - discount - cashback);

		if (paid_amount < repayment_amount_expected) {

			repaymentInterest = ((interest_fee + rounding_amount - discount_repayment) / repayment_amount_expected) * (paid_amount + cashback - late_fee);	// Update 23 Nov 2022
			// repaymentInterest = ((interest_fee + rounding_amount - discount) / repayment_amount_expected) * (paid_amount + cashback - late_fee);	// Update 21 Nov 2022
			// repaymentInterest = ((interest_fee + rounding_amount) / (amount_to_finance + interest_fee + rounding_amount)) * (paid_amount + discount + cashback - late_fee);	// Update 20 Oct 2022
			// repaymentInterest = ((interest_fee + rounding_amount) / (amount_to_finance + interest_fee + rounding_amount)) * (paid_amount + discount + cashback);	// Update 20 Oct 2022
			// repaymentInterest = ((interest_fee + rounding_amount) / (amount_to_finance + interest_fee + rounding_amount)) * (paid_amount + discount + cashback);		// Update 10 Oct 2022
			// repaymentInterest = (interest_fee / (amount_to_finance + interest_fee + rounding_amount)) * (paid_amount + discount + cashback);		// Update 04 Oct 2022
			// repaymentInterest = (interest_fee / (amount_to_finance + interest_fee)) * (paid_amount + discount + cashback);

		} else {

			repaymentInterest = (interest_fee + rounding_amount - discount_repayment);	// Update 23 Nov 2022
			// repaymentInterest = (interest_fee + rounding_amount - discount);	// Update 21 Nov 2022
			// repaymentInterest = (interest_fee + rounding_amount);	// Update 10 Oct 2022
			// repaymentInterest = interest_fee;
		}

		return repaymentInterest;


		/*
			P2 = paid_amount
			N2 = loan_amount
			J2 = discount
			K2 = cashback
			E2 = amount_to_finance
			I2 = interest_fee
			U2 = rounding_amount
			O2/O6 = repayment_amount_expected
			L2 = late_fee
			D25 = discount_repayment
	   
	   
			Update Formula at 23 Nov 2022
			=============================
			=IF(P2<O6,(I2+U2-D25)/(O6)*(P2+K2-IF(L2>0,L2,0)),(I2+U2-D25))
	   
			Update Formula at 21 Nov 2022
			=============================
			=IF(P2<O6,(I2+U2-J2)/(O6)*(P2+K2-IF(L2>0,L2,0)),(I2+U2-J2))
	   
			Update Formula at 08 Nov 2022
			=============================
			=IF(P2<O6,(I2+U2)/(E2+I2+U2)*(P2+J2+K2-IF(L2>0,L2,0)),(I2+U2))
	   
			Update Formula at 20 Oct 2022
			=============================
			=IF(P2<O2,(I2+U2)/(E2+I2+U2)*(P2+J2+K2),(I2+U2))
	   
	   
			Update Formula at 10 Oct 2022
			=============================
		    
			=IF(P2<=(N2-J2-K2),(I2+U2)/(E2+I2+U2)*(P2+J2+K2),I2)
			ELSE (I2+U2)
	   
			Update Formula at 04 Oct 2022
			=============================
		    
			=IF(P2<=(N2-J2-K2),I2/(E2+I2+U2)*(P2+J2+K2),I2)
		    
		*/
	}

	function getBiayaKeterlambatanLender(
		lender,
		repayment_date,
		due_date_lender,
		R07_Lender_Penalty_Rate,
		B05_Principal_Amount,
		B04_Lender_Interest_Amount,
		lenderGracePeriod) {

		log.debug('getBiayaKeterlambatanLender');
		log.debug('lender ' + typeof lender, lender);
		log.debug('repayment_date ' + typeof repayment_date, repayment_date);
		log.debug('due_date_lender ' + typeof due_date_lender, due_date_lender);
		log.debug('R07_Lender_Penalty_Rate ' + typeof R07_Lender_Penalty_Rate, R07_Lender_Penalty_Rate);
		log.debug('B05_Principal_Amount ' + typeof B05_Principal_Amount, B05_Principal_Amount);
		log.debug('B04_Lender_Interest_Amount ' + typeof B04_Lender_Interest_Amount, B04_Lender_Interest_Amount);
		log.debug('lenderGracePeriod ' + typeof lenderGracePeriod, lenderGracePeriod);
		/*
			Variable
			========
			Q2 = repayment_date
			T2 = due_date_lender
			VLOOKUP(R2,$R$9:$V$15,5,0) = return lenderGracePeriod by Lender
	   
			Formula lateDay after 01 Nov 2022
			=================================
	   
			=IF(Q2<=(T2+VLOOKUP(R2,$R$9:$V$15,5,0)),0,Q2-T2-VLOOKUP(R2,$R$9:$V$15,5,0))
	   
	   
			 Formula lateDay before 01 Nov 2022
			==================================
	   
			=IF(Q2<=(T2+VLOOKUP(R2,$R$9:$V$15,5,0)),0,Q2-T2)
		*/

		var temp_repayment_date = moment(new Date(repayment_date));
		var temp_due_date_lander = moment(new Date(due_date_lender));
		var temp_due_date_lander_add = moment(new Date(due_date_lender));

		var temp_plus = temp_due_date_lander_add.add(lenderGracePeriod, 'days');

		log.debug('temp_repayment_date ' + typeof temp_repayment_date, temp_repayment_date);
		log.debug('temp_due_date_lander ' + typeof temp_due_date_lander, temp_due_date_lander);
		log.debug('temp_due_date_lander_add ' + typeof temp_due_date_lander_add, temp_due_date_lander_add);
		log.debug('temp_plus ' + typeof temp_plus, temp_plus);

		var lateDay = 0;

		if (temp_repayment_date <= temp_plus) {
			lateDay = 0;
		} else {
			var temp_diff = temp_repayment_date.diff(temp_due_date_lander, 'days');
			lateDay = temp_diff - lenderGracePeriod;
		}

		log.debug('lateDay ' + typeof lateDay, lateDay);

		var biayaKeterlambatanLender = 0;

		log.debug('getLenderType(lender) ' + typeof getLenderType(lender), getLenderType(lender));

		if (getLenderType(lender) == 'Executing') {
			log.debug('biayaKeterlambatanLender Executing');

			biayaKeterlambatanLender = 0;
		} else {
			log.debug('biayaKeterlambatanLender Channeling');

			if (lateDay >= 30) {
				biayaKeterlambatanLender = 30 * R07_Lender_Penalty_Rate * (B05_Principal_Amount + B04_Lender_Interest_Amount);
			} else {
				biayaKeterlambatanLender = lateDay * R07_Lender_Penalty_Rate * (B05_Principal_Amount + B04_Lender_Interest_Amount);
			}
		}

		log.debug('biayaKeterlambatanLender ' + typeof biayaKeterlambatanLender, biayaKeterlambatanLender);

		return biayaKeterlambatanLender;
	}

	function getBiayaKeterlambatanLenderV2(
		lender,
		repayment_date,
		due_date_lender,
		R07_Lender_Penalty_Rate,
		B05_Principal_Amount,
		B04_Lender_Interest_Amount,
		lenderGracePeriod) {

		log.debug('getBiayaKeterlambatanLenderV2');
		log.debug('lender ' + typeof lender, lender);
		log.debug('repayment_date ' + typeof repayment_date, repayment_date);
		log.debug('due_date_lender ' + typeof due_date_lender, due_date_lender);
		log.debug('R07_Lender_Penalty_Rate ' + typeof R07_Lender_Penalty_Rate, R07_Lender_Penalty_Rate);
		log.debug('B05_Principal_Amount ' + typeof B05_Principal_Amount, B05_Principal_Amount);
		log.debug('B04_Lender_Interest_Amount ' + typeof B04_Lender_Interest_Amount, B04_Lender_Interest_Amount);
		log.debug('lenderGracePeriod ' + typeof lenderGracePeriod, lenderGracePeriod);
		/*
			Variable
			========
			Q2 = repayment_date
			T2 = due_date_lender
			VLOOKUP(R2,$R$9:$V$15,5,0) = return lenderGracePeriod by Lender
	   
			Formula lateDay after 01 Nov 2022
			=================================
	   
			=IF(Q2<=(T2+VLOOKUP(R2,$R$9:$V$15,5,0)),0,Q2-T2-VLOOKUP(R2,$R$9:$V$15,5,0))
	   
	   
			 Formula lateDay before 01 Nov 2022
			==================================
	   
			=IF(Q2<=(T2+VLOOKUP(R2,$R$9:$V$15,5,0)),0,Q2-T2)

			Formula G9 as of 09 May 2024
			============================
			=IF(VLOOKUP(T2,$T$9:$X$15,2,0)="Executing",0,IF(E9>=30,30*F9*(E2+D9),E9*F9*(E2+D9)))
			E9 = Late Day
			F9 = Bunga Keterlambatan Lender
			E2 = Amount to Finance  -> datastaging.amount_to_finance -> B05_Principal_Amount
			D9 = Interest to Lender -> B04_Lender_Interest_Amount
			
		*/

		var temp_repayment_date = moment(new Date(repayment_date));
		var temp_due_date_lander = moment(new Date(due_date_lender));
		var temp_due_date_lander_add = moment(new Date(due_date_lender));

		var temp_plus = temp_due_date_lander_add.add(lenderGracePeriod, 'days');

		log.debug('temp_repayment_date ' + typeof temp_repayment_date, temp_repayment_date);
		log.debug('temp_due_date_lander ' + typeof temp_due_date_lander, temp_due_date_lander);
		log.debug('temp_due_date_lander_add ' + typeof temp_due_date_lander_add, temp_due_date_lander_add);
		log.debug('temp_plus ' + typeof temp_plus, temp_plus);

		var lateDay = 0;

		if (temp_repayment_date <= temp_plus) {
			lateDay = 0;
		} else {
			var temp_diff = temp_repayment_date.diff(temp_due_date_lander, 'days');
			lateDay = temp_diff; // update 13 Mei 2024
		}

		log.debug('lateDay ' + typeof lateDay, lateDay);

		var biayaKeterlambatanLender = 0;

		log.debug('getLenderType(lender) ' + typeof getLenderType(lender), getLenderType(lender));

		if (getLenderType(lender) == 'Executing') {
			log.debug('biayaKeterlambatanLender Executing');

			biayaKeterlambatanLender = 0;
		} else {
			log.debug('biayaKeterlambatanLender Channeling');

			if (lateDay >= 30) {
				biayaKeterlambatanLender = 30 * R07_Lender_Penalty_Rate * (B05_Principal_Amount + B04_Lender_Interest_Amount);
			} else {
				biayaKeterlambatanLender = lateDay * R07_Lender_Penalty_Rate * (B05_Principal_Amount + B04_Lender_Interest_Amount);
			}
		}

		log.debug('biayaKeterlambatanLender ' + typeof biayaKeterlambatanLender, biayaKeterlambatanLender);

		return biayaKeterlambatanLender;
	}

	function getSTIBankPenalty(paid_amount, amount_to_finance, interest_fee, discount, cashback, waive_fee, late_fee, loan_amount, R08_Lender_Penalty_Amount) {

		var principalPaid = 0;				// H9
		var interestPaid = 0;				// I9
		var penaltyPaymentToLender = 0;		// J9
		var penaltyPaymentToSTI = 0;

		var expectedPaid = loan_amount - discount - cashback;


		if (paid_amount <= expectedPaid) {

			principalPaid = (amount_to_finance / (amount_to_finance + interest_fee)) * (paid_amount + discount + cashback);

			interestPaid = (interest_fee / (amount_to_finance + interest_fee)) * (paid_amount + discount + cashback);

		} else {

			principalPaid = amount_to_finance;

			interestPaid = interest_fee;
		}



		if ((principalPaid + interestPaid) != loan_amount) {

			penaltyPaymentToLender = 0;

		} else {

			if (paid_amount >= (amount_to_finance + interest_fee - discount - cashback - waive_fee)) {

				if (paid_amount <= ((amount_to_finance + interest_fee - discount - cashback - waive_fee) + R08_Lender_Penalty_Amount)) {

					penaltyPaymentToLender = paid_amount - (amount_to_finance + interest_fee - discount - cashback - waive_fee);

				} else {

					penaltyPaymentToLender = R08_Lender_Penalty_Amount;

				}

			}

		}


		if (paid_amount <= ((amount_to_finance + interest_fee - discount - cashback - waive_fee) + penaltyPaymentToLender)) {

			penaltyPaymentToSTI = 0;

		} else {

			if (paid_amount <= ((amount_to_finance + interest_fee - discount - cashback - waive_fee) + late_fee)) {

				penaltyPaymentToSTI = paid_amount - (amount_to_finance + interest_fee - discount - cashback - waive_fee) - penaltyPaymentToLender;

			} else {

				penaltyPaymentToSTI = late_fee - discount - waive_fee;

			}

		}


		return penaltyPaymentToSTI;

	}

	function getOverpayment(paid_amount, amount_to_finance, interest_fee, late_fee, discount, cashback, waive_fee, rounding_amount) {

		var totalRepayment = amount_to_finance + interest_fee + late_fee - discount - cashback - waive_fee + rounding_amount;	// Update 04 Oct 2022
		// var totalRepayment = amount_to_finance + interest_fee + late_fee - discount - cashback - waive_fee;

		if (paid_amount > totalRepayment) {

			return paid_amount - totalRepayment;

		} else {

			return 0;

		}

		/*
			Update per 04 Oct 2022
		    
			N9 =I2+E2+L2-J2-K2-M2+U2
		    
			=IF(P2>N9,P2-N9,0)
		    
			P2 = paid_amount
			I2 = interest_fee
			E2 = amount_to_finance
			L2 = late_fee
			J2 = discount
			K2 = cashback
			M2 = waive_fee
			U2 = rounding_amount
		*/

	}

	function getLenderType(lender) {

		var lenderType = '';

		var searchLender = search.create({
			type: search.Type.VENDOR,
			columns: ['internalid', 'entityid', 'custentity_sti_lender_type'],
			filters: ['entityid', 'is', lender]
		});

		var myResultSet = searchLender.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 1
		});

		if (resultRange.length > 0) {
			lenderType = resultRange[0].getText({
				name: 'custentity_sti_lender_type'
			});
		}

		return lenderType;
	}

	function calculateCode(data) {

		/*
	    
		Step Add/Update calculateCode
		1. Add new variable code on this function
		2. If Add Field, Add Field on Record Calculation Formula Staging Data
		3. Add/Update on function createCalculateRecord
		4. Add/Update on function getSourceMappingValue
		5. Update range code on STI CS Validation Template Journal
	    
		*/

		// Initial Value
		var B01_Interest_Rate = 0;
		var B02_Interest_Amount = 0;
		var B03_Lender_Interest_Rate = 0;
		var B04_Lender_Interest_Amount = 0;
		var B05_Principal_Amount = 0;
		var B07_STI_interest_Amount = 0;
		var B08_Expected_Cashback = 0;	// Add at 06 Oct 2022
		var B09_Expected_STI_Revenue_Net = 0;	// Add at 06 Oct 2022
		var B10_Expected_VAT_Out = 0;	// Add at 06 Oct 2022
		var B11_Rounding_Amount = 0;	// Add at 06 Oct 2022
		var B12_Discount_Repayment = 0;	// Add at 21 Nov 2022
		var B13_Lender_Interest_Net = 0;	// Add at 06 May 2024
		var B14_WHT_Lender = 0;				// Add at 06 May 2024

		var R01_Repayment_Amount = 0;
		var R02_Repayment_Principal = 0;
		var R03_Repayment_Interest = 0;
		var R04_Repayment_Discount = 0;
		var R05_Repayment_Cashback = 0;
		var R06_Penalty_Amount = 0;
		var R07_Lender_Penalty_Rate = 0;
		var R08_Lender_Penalty_Amount = 0;
		var R09_STI_Bank_Interest = 0;
		var R10_STI_Bank_Penalty = 0;
		var R11_Channeler_Bank = 0;
		var R12_STI_Revenue = 0;
		var R13_PPN_Rate = 0;
		var R14_Tax_Payable_VAT = 0;
		var R15_Waive = 0;
		var R16_Discount_Or_Cashback_Clearing = 0;
		var R17_VAT_Out_Discount_Or_Cashback = 0;
		var R18_Bank_STI_Discount_Or_Cashback = 0;
		var R19_Partial_STI_Interest = 0;
		var R20_Partial_VAT_Out = 0;
		var R20_Lenderfee_Expenses = 0;	// Add at 17 Fen 2022
		var R21_PPH23_Or_PPH26 = 0;
		var R22_PPH_Amount = 0;
		var R23_Executing_Bank_After_PPH = 0;
		var R24_AR_Merchant = 0;
		var R25_Overpayment = 0;
		var R26_Lender_Interest_Amount = 0;
		var R27_Discount_Repayment = 0;	// Add at 24 Oct 2022
		// var R28_Refund							= 0;	// Add at 19 Jun 2023

		var datastaging = JSON.parse(data);
		var datalender = JSON.parse(getLenderInformation(datastaging.lender))[0];

		var transaction_date = getTransactionDate(datastaging.transaction_type, datastaging.repayment_date, datastaging.delivery_date);


		// Variable for Lender Type Channeling
		// ===================================

		B01_Interest_Rate = datastaging.interest_rate;
		B02_Interest_Amount = datastaging.interest_fee;
		B03_Lender_Interest_Rate = datastaging.lender_interest_rate;

		B05_Principal_Amount = datastaging.amount_to_finance;
		B04_Lender_Interest_Amount = getInterestToLender(B05_Principal_Amount, datastaging.billing_cycle, datastaging.suffixBillingCycle, B03_Lender_Interest_Rate);			// D9
		B06_Loan_Amount = datastaging.loan_amount;

		B11_Rounding_Amount = datastaging.rounding_amount;

		B12_Discount_Repayment = getDiscountRepayment(B02_Interest_Amount, B05_Principal_Amount, B06_Loan_Amount);

		B07_STI_interest_Amount = B02_Interest_Amount - B04_Lender_Interest_Amount + B11_Rounding_Amount - B12_Discount_Repayment; // Effective at 22 Nov 2022
		// B07_STI_interest_Amount		= B02_Interest_Amount - B04_Lender_Interest_Amount + B11_Rounding_Amount - datastaging.discount; // Effective at 21 Nov 2022
		// B07_STI_interest_Amount		= B02_Interest_Amount - B04_Lender_Interest_Amount + B11_Rounding_Amount; // Effective at 9 oct 2022
		// B07_STI_interest_Amount		= B02_Interest_Amount - B04_Lender_Interest_Amount;

		B08_Expected_Cashback = datastaging.expected_cashback_amount;

		R13_PPN_Rate = getEffectivePPNRate(transaction_date);		// Need to set Preference based on Effective Date

		B10_Expected_VAT_Out = B07_STI_interest_Amount - (B07_STI_interest_Amount * (100 / (100 + R13_PPN_Rate)));

		B09_Expected_STI_Revenue_Net = B07_STI_interest_Amount - B10_Expected_VAT_Out;



		R01_Repayment_Amount = datastaging.paid_amount;

		R04_Repayment_Discount = datastaging.discount;
		R05_Repayment_Cashback = datastaging.cashback;

		R06_Penalty_Amount = datastaging.late_fee;		// Effective at 06 Oct 2022
		// R06_Penalty_Amount			= datastaging.late_fee - datastaging.waive_fee;

		R02_Repayment_Principal = getRepaymentPrinciple(
			datastaging.paid_amount,
			datastaging.loan_amount,
			datastaging.discount,
			datastaging.cashback,
			datastaging.amount_to_finance,
			datastaging.interest_fee,
			datastaging.rounding_amount,
			datastaging.repayment_amount_expected,
			datastaging.late_fee
		);

		R03_Repayment_Interest = getRepaymentInterest(
			datastaging.paid_amount,
			datastaging.loan_amount,
			datastaging.discount,
			datastaging.cashback,
			datastaging.amount_to_finance,
			datastaging.interest_fee,
			datastaging.rounding_amount,
			datastaging.repayment_amount_expected,
			datastaging.late_fee,
			B12_Discount_Repayment
		);		//I9

		R07_Lender_Penalty_Rate = datastaging.lender_penalty_rate;


		R26_Lender_Interest_Amount = calculateCodeR26(B04_Lender_Interest_Amount, B07_STI_interest_Amount, R03_Repayment_Interest);

		

		if (datastaging.repayment_date != '') {

			var data_repayment = getRepaymentInfo(datastaging.loan_id, datastaging.delivery_date);
			log.debug('data_repayment ' + typeof data_repayment, data_repayment);

			var due_date_lender = '';
			if (datastaging.transaction_type == 'latefee') {
				due_date_lender = data_repayment.due_date_lender;
			}
			else {
				due_date_lender = datastaging.due_date_lender;
			}

			R08_Lender_Penalty_Amount = getBiayaKeterlambatanLenderV2(
				datastaging.lender,
				datastaging.repayment_date,
				due_date_lender,
				R07_Lender_Penalty_Rate,
				B05_Principal_Amount,
				B04_Lender_Interest_Amount,
				datastaging.lender_grace_period
			);		// G9

			R10_STI_Bank_Penalty = R06_Penalty_Amount - R08_Lender_Penalty_Amount;	// Effective at 6 Oct 2022
			// R10_STI_Bank_Penalty 		= getSTIBankPenalty(
			// datastaging.paid_amount, 
			// datastaging.amount_to_finance, 
			// datastaging.interest_fee, 
			// datastaging.discount, 
			// datastaging.cashback, 
			// datastaging.waive_fee, 
			// datastaging.late_fee, 
			// datastaging.loan_amount, 
			// R08_Lender_Penalty_Amount
			// );
			R11_Channeler_Bank = R02_Repayment_Principal + R26_Lender_Interest_Amount;	// Update at 28 Oct 2022
			//R11_Channeler_Bank			= R02_Repayment_Principal + R08_Lender_Penalty_Amount + R26_Lender_Interest_Amount;	// Update at 26 Sept 2022
			// R11_Channeler_Bank 			= R02_Repayment_Principal + B04_Lender_Interest_Amount + R08_Lender_Penalty_Amount;	// Version before 26 Sept 2022
		}

		R15_Waive = datastaging.waive_fee;
		R16_Discount_Or_Cashback_Clearing = R04_Repayment_Discount + R05_Repayment_Cashback;
		R17_VAT_Out_Discount_Or_Cashback = R16_Discount_Or_Cashback_Clearing - ((R16_Discount_Or_Cashback_Clearing * 100) / (100 + R13_PPN_Rate));
		R18_Bank_STI_Discount_Or_Cashback = R16_Discount_Or_Cashback_Clearing - R17_VAT_Out_Discount_Or_Cashback;





		R20_Partial_VAT_Out = R03_Repayment_Interest - R19_Partial_STI_Interest;	// Replace to R20_Lenderfee_Expenses
		R20_Lenderfee_Expenses = getLenderfeeExpense(R15_Waive, R06_Penalty_Amount, R08_Lender_Penalty_Amount);


		R21_PPH23_Or_PPH26 = datastaging.lender_pph_tax_rate;

		R22_PPH_Amount = R26_Lender_Interest_Amount * (R21_PPH23_Or_PPH26);
		// R22_PPH_Amount				= B04_Lender_Interest_Amount * (R21_PPH23_Or_PPH26);

		R19_Partial_STI_Interest = R26_Lender_Interest_Amount - R22_PPH_Amount;	// Update 3 Dec 2022
		// R19_Partial_STI_Interest 	= (R03_Repayment_Interest * 100) / (100 + R13_PPN_Rate);

		R23_Executing_Bank_After_PPH = R11_Channeler_Bank - R22_PPH_Amount;

		R24_AR_Merchant = R02_Repayment_Principal + R03_Repayment_Interest;

		// R25_Overpayment				= datastaging.overpayment; // Update 26 April 2023
		// Paid Amount at Staging already separated from Overpayment Amount		// 16 June 2023
		R25_Overpayment = getOverpayment(
			datastaging.paid_amount,
			datastaging.amount_to_finance,
			datastaging.interest_fee,
			datastaging.late_fee,
			datastaging.discount,
			datastaging.cashback,
			datastaging.waive_fee,
			datastaging.rounding_amount
		);


		R27_Discount_Repayment = R24_AR_Merchant + R25_Overpayment - R01_Repayment_Amount + R06_Penalty_Amount;		// Update 11 Nov 2022 =D49+D50-D26+D31
		// R27_Discount_Repayment		= R24_AR_Merchant + R25_Overpayment - R01_Repayment_Amount;	// Update 25 Oct 2022
		// R27_Discount_Repayment		= R24_AR_Merchant - R01_Repayment_Amount;

		R09_STI_Bank_Interest = R03_Repayment_Interest - R26_Lender_Interest_Amount - R27_Discount_Repayment;	// Update at 21 Nov 2022		// Update at 21 Nov 2022
		// R09_STI_Bank_Interest			= R03_Repayment_Interest - R26_Lender_Interest_Amount;		// Update at 26 Sept 2022
		// var R09_STI_Bank_Interest 		= R03_Repayment_Interest - B04_Lender_Interest_Amount; 	// Version before 26 Sept 2022

		R14_Tax_Payable_VAT = R09_STI_Bank_Interest - (R09_STI_Bank_Interest * 100 / (100 + R13_PPN_Rate));

		R12_STI_Revenue = R09_STI_Bank_Interest - R14_Tax_Payable_VAT;

		// R28_Refund					= datastaging.refund;			// Add 19 Jun 2023

		// Add 06 May 2024
		B14_WHT_Lender = B04_Lender_Interest_Amount * R21_PPH23_Or_PPH26;
		B13_Lender_Interest_Net = B04_Lender_Interest_Amount - B14_WHT_Lender;




		return {

			'B01': B01_Interest_Rate,
			'B02': B02_Interest_Amount,
			'B03': B03_Lender_Interest_Rate,
			'B04': B04_Lender_Interest_Amount,
			'B05': B05_Principal_Amount,
			'B06': B06_Loan_Amount,
			'B07': B07_STI_interest_Amount,
			'B08': B08_Expected_Cashback,
			'B09': B09_Expected_STI_Revenue_Net,
			'B10': B10_Expected_VAT_Out,
			'B11': B11_Rounding_Amount,
			'B12': B12_Discount_Repayment,
			'B13': B13_Lender_Interest_Net,
			'B14': B14_WHT_Lender,
			'R01': R01_Repayment_Amount,
			'R02': R02_Repayment_Principal,
			'R03': R03_Repayment_Interest,
			'R04': R04_Repayment_Discount,
			'R05': R05_Repayment_Cashback,
			'R06': R06_Penalty_Amount,
			'R07': parseFloat(R07_Lender_Penalty_Rate)*100,
			'R08': R08_Lender_Penalty_Amount,
			'R09': R09_STI_Bank_Interest,
			'R10': R10_STI_Bank_Penalty,
			'R11': R11_Channeler_Bank,
			'R12': R12_STI_Revenue,
			'R13': R13_PPN_Rate,
			'R14': R14_Tax_Payable_VAT,
			'R15': R15_Waive,
			'R16': R16_Discount_Or_Cashback_Clearing,
			'R17': R17_VAT_Out_Discount_Or_Cashback,
			'R18': R18_Bank_STI_Discount_Or_Cashback,
			'R19': R19_Partial_STI_Interest,
			// 'R20'	: R20_Partial_VAT_Out,  // Change to R20_Lenderfee_Expenses
			'R20': R20_Lenderfee_Expenses,
			'R21': R21_PPH23_Or_PPH26,
			'R22': R22_PPH_Amount,
			'R23': R23_Executing_Bank_After_PPH,
			'R24': R24_AR_Merchant,
			'R25': R25_Overpayment,
			'R26': R26_Lender_Interest_Amount,
			'R27': R27_Discount_Repayment
			//'R28'	: R28_Refund
		}
	}


	function getTemplateTypeByCondition(
		subsidiary,
		template_type,
		lendertype,
		supplier_transfer,
		id_transaction_type,
		loan_id,
		id_bg_process
	) {

		log.debug('template_type ' + typeof template_type, template_type);
		log.debug('lendertype ' + typeof lendertype, lendertype);
		log.debug('supplier_transfer ' + typeof supplier_transfer, supplier_transfer);
		log.debug('id_transaction_type ' + typeof id_transaction_type, id_transaction_type);
		log.debug('loan_id ' + typeof loan_id, loan_id);


		var firstPayement = false;

		// Count Repayment
		// ===============
		if (id_transaction_type == 2) {		// 2 is id repayment on transaction type list

			if (countRepaymentByLoanID(loan_id) == 0) {
				firstPayement = true;
			}

		}

		var data = {
			'subsidiary': subsidiary,
			'transaction_type': id_transaction_type,
			'lendertype': lendertype,
			'supplier_transfer': supplier_transfer,
			'firstPayement': firstPayement
		};

		log.debug('data getTemplateTypeByCondition ' + typeof data, data);

		var id_template = findSuitableTemplateType01(data);

		return id_template;

	}

	function findSuitableTemplateType01(data) {

		log.debug('findSuitableTemplateType01');

		var searchData = search.create({
			type: 'customrecord_sti_template_type',
			columns: ['internalid'],
			filters: [
				['custrecord_sti_tt_subsidiary', 'is', data.subsidiary], 'and',
				['custrecord_sti_tt_transaction_type', 'is', data.transaction_type], 'and',
				['custrecord_sti_tt_lender_type', 'is', data.lendertype], 'and',
				['custrecord_sti_tt_supplier_transfer', 'is', data.supplier_transfer], 'and',
				['custrecord_sti_tt_fullpaid', 'is', data.firstPayement]
			]
		});

		var myResultSet = searchData.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 10
		});

		log.debug('resultRange', resultRange);
		log.debug('resultRange.length', resultRange.length);

		if (resultRange.length > 0) {

			var templateId = resultRange[0].getValue('internalid');

			return parseInt(templateId);

		} else {

			return findSuitableTemplateType02(data);

		}
	}

	function findSuitableTemplateType02(data) {

		log.debug('findSuitableTemplateType02');

		var searchData = search.create({
			type: 'customrecord_sti_template_type',
			columns: ['internalid'],
			filters: [
				['custrecord_sti_tt_subsidiary', 'is', data.subsidiary], 'and',
				['custrecord_sti_tt_transaction_type', 'is', data.transaction_type], 'and',
				['custrecord_sti_tt_lender_type', 'is', data.lendertype], 'and',
				['custrecord_sti_tt_supplier_transfer', 'is', data.supplier_transfer]
			]
		});

		var myResultSet = searchData.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 10
		});

		log.debug('resultRange', resultRange);
		log.debug('resultRange.length', resultRange.length);

		if (resultRange.length > 0) {

			var templateId = resultRange[0].getValue('internalid');

			return parseInt(templateId);

		} else {

			log.debug('No Suitable template !');

			return findSuitableTemplateType03(data);
		}
	}

	function findSuitableTemplateType03(data) {

		log.debug('findSuitableTemplateType03');

		var searchData = search.create({
			type: 'customrecord_sti_template_type',
			columns: ['internalid'],
			filters: [
				['custrecord_sti_tt_subsidiary', 'is', data.subsidiary], 'and',
				['custrecord_sti_tt_transaction_type', 'is', data.transaction_type], 'and',
				['custrecord_sti_tt_lender_type', 'is', data.lendertype]
			]
		});

		var myResultSet = searchData.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 10
		});

		log.debug('resultRange', resultRange);
		log.debug('resultRange.length', resultRange.length);

		if (resultRange.length > 0) {

			var templateId = resultRange[0].getValue('internalid');

			return parseInt(templateId);

		} else {

			log.debug('No Suitable template !');

			return 0;

		}
	}

	function createCalculateRecord(data_calculate, id_staging, loan_id, id_transaction_type, transaction_type, id_template) {

		log.debug('Run Calculation Formula');


		log.debug('data_calculate ' + typeof data_calculate, data_calculate);
		log.debug('id_staging ' + typeof id_staging, id_staging);
		log.debug('loan_id ' + typeof loan_id, loan_id);
		log.debug('transaction_type ' + typeof transaction_type, transaction_type);
		log.debug('id_template ' + typeof id_template, id_template);


		var calculationFormula = record.create({
			type: 'customrecord_sti_calculation_formula',
			isDynamic: true
		});


		calculationFormula.setValue('name', loan_id + ' ' + transaction_type);

		calculationFormula.setValue('custrecord_sti_cf_related_staging_data', id_staging);

		calculationFormula.setValue('custrecord_sti_cf_loan_id', loan_id);

		calculationFormula.setValue('custrecord_sti_cf_trans_type', id_transaction_type);

		calculationFormula.setValue('custrecord_sti_cf_template_type', id_template);



		calculationFormula.setValue('custrecord_sti_cf_b01', data_calculate.B01);
		calculationFormula.setValue('custrecord_sti_cf_b02', data_calculate.B02);
		calculationFormula.setValue('custrecord_sti_cf_b03', data_calculate.B03);
		calculationFormula.setValue('custrecord_sti_cf_b04', data_calculate.B04);
		calculationFormula.setValue('custrecord_sti_cf_b05', data_calculate.B05);
		calculationFormula.setValue('custrecord_sti_cf_b06', data_calculate.B06);
		calculationFormula.setValue('custrecord_sti_cf_b07', data_calculate.B07);
		calculationFormula.setValue('custrecord_sti_cf_b08', data_calculate.B08);
		calculationFormula.setValue('custrecord_sti_cf_b09', data_calculate.B09);
		calculationFormula.setValue('custrecord_sti_cf_b10', data_calculate.B10);
		calculationFormula.setValue('custrecord_sti_cf_b11', data_calculate.B11);
		calculationFormula.setValue('custrecord_sti_cf_b12', data_calculate.B12);	// Add 21 Nov 2022
		calculationFormula.setValue('custrecord_sti_cf_b13', data_calculate.B13);	// Add 06 May 2024
		calculationFormula.setValue('custrecord_sti_cf_b14', data_calculate.B14);	// Add 06 May 2024

		calculationFormula.setValue('custrecord_sti_cf_r01', data_calculate.R01);
		calculationFormula.setValue('custrecord_sti_cf_r02', data_calculate.R02);
		calculationFormula.setValue('custrecord_sti_cf_r03', data_calculate.R03);
		calculationFormula.setValue('custrecord_sti_cf_r04', data_calculate.R04);
		calculationFormula.setValue('custrecord_sti_cf_r05', data_calculate.R05);
		calculationFormula.setValue('custrecord_sti_cf_r06', data_calculate.R06);
		calculationFormula.setValue('custrecord_sti_cf_r07', data_calculate.R07);
		calculationFormula.setValue('custrecord_sti_cf_r08', data_calculate.R08);
		calculationFormula.setValue('custrecord_sti_cf_r09', data_calculate.R09);
		calculationFormula.setValue('custrecord_sti_cf_r10', data_calculate.R10);
		calculationFormula.setValue('custrecord_sti_cf_r11', data_calculate.R11);
		calculationFormula.setValue('custrecord_sti_cf_r12', data_calculate.R12);
		calculationFormula.setValue('custrecord_sti_cf_r13', data_calculate.R13);
		calculationFormula.setValue('custrecord_sti_cf_r14', data_calculate.R14);
		calculationFormula.setValue('custrecord_sti_cf_r15', data_calculate.R15);
		calculationFormula.setValue('custrecord_sti_cf_r16', data_calculate.R16);
		calculationFormula.setValue('custrecord_sti_cf_r17', data_calculate.R17);
		calculationFormula.setValue('custrecord_sti_cf_r18', data_calculate.R18);
		calculationFormula.setValue('custrecord_sti_cf_r19', data_calculate.R19);
		calculationFormula.setValue('custrecord_sti_cf_r20', data_calculate.R20);

		calculationFormula.setValue('custrecord_sti_cf_r21', data_calculate.R21);
		calculationFormula.setValue('custrecord_sti_cf_r22', data_calculate.R22);
		calculationFormula.setValue('custrecord_sti_cf_r23', data_calculate.R23);

		calculationFormula.setValue('custrecord_sti_cf_r24', data_calculate.R24);				// Add 28 August 2022
		calculationFormula.setValue('custrecord_sti_cf_r25', data_calculate.R25);				// Add 28 August 2022
		calculationFormula.setValue('custrecord_sti_cf_r26', data_calculate.R26);				// Add 26 September 2022
		calculationFormula.setValue('custrecord_sti_cf_r27', data_calculate.R27);				// Add 24 October 2022
		// calculationFormula.setValue('custrecord_sti_cf_r28', data_calculate.R28);				// Add 19 June 2023

		calculationFormula.save();


		return calculationFormula.id;

		// log.debug('calculationFormula.id', calculationFormula.id);
	}


	function getTemplateJournal(id_template, collection_account, pph_tax_account, len_acc_coa, data_calculate) {

		var columnsHeader = [];

		columnsHeader.push(search.createColumn('internalid'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_template_type'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_subsidiary'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_lender_type'));
		columnsHeader.push(search.createColumn({
			name: 'custrecord_sti_tj_sort_number',
			sort: search.Sort.ASC
		}));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_use_collect_bank_acc'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_use_tax_pph_acc_lender'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_use_direct_account'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_use_lender_acc_coa'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_account'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_sign'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_source_mapping'));
		columnsHeader.push(search.createColumn('custrecord_sti_tj_description'));

		var template_journal = search.create({
			type: 'customrecord_sti_template_journal',
			columns: columnsHeader,
			filters: ['custrecord_sti_tj_template_type', 'is', id_template]
		});

		var resultSet = template_journal.run();

		var results = resultSet.getRange({
			start: 0, end: 1000
		});


		log.debug('results.length', results.length);
		// log.debug('results', results);

		var data = new Array();

		var error = 0;

		if (results.length > 0) {

			for (var i = 0; i < results.length; i++) {

				var use_collect_bank_acc = results[i].getValue('custrecord_sti_tj_use_collect_bank_acc');
				var use_tax_pph_acc_lender = results[i].getValue('custrecord_sti_tj_use_tax_pph_acc_lender');
				var use_direct_account = results[i].getValue('custrecord_sti_tj_use_direct_account');
				var use_lender_acc_coa = results[i].getValue('custrecord_sti_tj_use_lender_acc_coa');
				var sort_number = results[i].getValue('custrecord_sti_tj_sort_number');
				var account = results[i].getValue('custrecord_sti_tj_account');
				var sign = results[i].getText('custrecord_sti_tj_sign');
				var source_mapping = results[i].getValue('custrecord_sti_tj_source_mapping');
				var description = results[i].getValue('custrecord_sti_tj_description');


				var template_account = 0;

				var error_count = 0;
				var error_description = '';

				if (use_collect_bank_acc == true) {

					template_account = collection_account;

				}

				if (use_tax_pph_acc_lender == true) {

					template_account = pph_tax_account;

				}

				if (use_direct_account == true) {

					template_account = account;

				}

				if (use_lender_acc_coa == true) {

					template_account = len_acc_coa;

				}

				var source_value = getSourceMappingValue(source_mapping, data_calculate);


				if (template_account == 0) {
					error += 1;
				}


				data.push({
					'sort_number': sort_number,
					'template_account': parseInt(template_account),
					'sign': sign,
					'source_mapping': source_mapping,
					'source_value': source_value,
					'description': description
				});

			}

		}

		var param = new Array();

		param.push({
			'error': error,
			'data': data
		});

		return JSON.stringify(param);

	}


	function runTemplateJournal(
		id_staging,
		id_transaction_type,
		id_template,
		repayment_date,
		delivery_date,
		id_calculate,
		template_journal
	) {


		var totalDebit = 0;
		var totalCredit = 0;

		log.debug('id_staging ' + typeof id_staging, id_staging);
		log.debug('id_transaction_type ' + typeof id_transaction_type, id_transaction_type);
		log.debug('id_template ' + typeof id_template, id_template);
		log.debug('repayment_date ' + typeof repayment_date, repayment_date);
		log.debug('delivery_date ' + typeof delivery_date, delivery_date);
		log.debug('id_calculate ' + typeof id_calculate, id_calculate);
		log.debug('template_journal ' + typeof template_journal, template_journal);

		var getTransDate = getTransactionDate(id_transaction_type, repayment_date, delivery_date);
		log.debug('getTransDate ' + typeof getTransDate, getTransDate);

		var testPeriod = validationAccountingPeriod(getTransDate);
		log.debug('testPeriod ' + typeof testPeriod, testPeriod);

		var JournalEntry = record.create({
			type: getIdTransaction(id_transaction_type),
			isDynamic: true
		});

		JournalEntry.setValue('subsidiary', getTemplateTypeSubsidiary(id_template)); 										// STI
		JournalEntry.setText('trandate', getTransactionDate(id_transaction_type, repayment_date, delivery_date));
		JournalEntry.setValue('custbody_sti_transaction_type', id_transaction_type);
		JournalEntry.setValue('custbody_sti_related_staging_data', id_staging);
		JournalEntry.setValue('custbody_sti_related_calc_formula', id_calculate);
		JournalEntry.setValue('custbody_sti_template_type', id_template);


		// var template_journal = JSON.parse(obj_template_journal);

		if (template_journal.length > 0) {

			for (var i = 0; i < template_journal.length; i++) {

				log.debug('template_journal[i] ' + typeof template_journal[i], template_journal[i]);

				var amount = roundTwo(template_journal[i].source_value);

				if (template_journal[i].sign == 'debit') {
					totalDebit = totalDebit + amount;
				}
				if (template_journal[i].sign == 'credit') {
					totalCredit = totalCredit + amount;
				}

				setJournalLine(JournalEntry, template_journal[i].template_account, template_journal[i].sign, amount, '', template_journal[i].description);
			}

		}





		var difference = totalDebit - totalCredit;

		log.debug('totalDebit', totalDebit);
		log.debug('totalCredit', totalCredit);

		log.debug('difference', difference);



		if (difference != 0) {
			if (totalDebit - totalCredit > 0) {
				setJournalLine(JournalEntry, ACC_DIFFERENCE, 'credit', Math.abs(difference), '', '');
			} else {
				setJournalLine(JournalEntry, ACC_DIFFERENCE, 'debit', Math.abs(difference), '', '');
			}
		}


		JournalEntry.save();

		return JournalEntry.id;
	}

	function getSourceMappingValue(source_mapping, data_calculate) {

		if (source_mapping == 'B01') {
			return data_calculate.B01;
		}
		else if (source_mapping == 'B02') {
			return data_calculate.B02;
		}
		else if (source_mapping == 'B03') {
			return data_calculate.B03;
		}
		else if (source_mapping == 'B04') {
			return data_calculate.B04;
		}
		else if (source_mapping == 'B05') {
			return data_calculate.B05;
		}
		else if (source_mapping == 'B06') {
			return data_calculate.B06;
		}
		else if (source_mapping == 'B07') {
			return data_calculate.B07;
		}
		else if (source_mapping == 'B08') {
			return data_calculate.B08;
		}
		else if (source_mapping == 'B09') {
			return data_calculate.B09;
		}
		else if (source_mapping == 'B10') {
			return data_calculate.B10;
		}
		else if (source_mapping == 'B11') {
			return data_calculate.B11;
		}
		else if (source_mapping == 'B12') {
			return data_calculate.B12;
		}
		else if (source_mapping == 'B13') {
			return data_calculate.B13;
		}
		else if (source_mapping == 'B14') {
			return data_calculate.B14;
		}

		else if (source_mapping == 'R01') {
			return data_calculate.R01;
		}
		else if (source_mapping == 'R02') {
			return data_calculate.R02;
		}
		else if (source_mapping == 'R03') {
			return data_calculate.R03;
		}
		else if (source_mapping == 'R04') {
			return data_calculate.R04;
		}
		else if (source_mapping == 'R05') {
			return data_calculate.R05;
		}
		else if (source_mapping == 'R06') {
			return data_calculate.R06;
		}
		else if (source_mapping == 'R07') {
			return data_calculate.R07;
		}
		else if (source_mapping == 'R08') {
			return data_calculate.R08;
		}
		else if (source_mapping == 'R09') {
			return data_calculate.R09;
		}
		else if (source_mapping == 'R10') {
			return data_calculate.R10;
		}
		else if (source_mapping == 'R11') {
			return data_calculate.R11;
		}
		else if (source_mapping == 'R12') {
			return data_calculate.R12;
		}
		else if (source_mapping == 'R13') {
			return data_calculate.R13;
		}
		else if (source_mapping == 'R14') {
			return data_calculate.R14;
		}
		else if (source_mapping == 'R15') {
			return data_calculate.R15;
		}
		else if (source_mapping == 'R16') {
			return data_calculate.R16;
		}
		else if (source_mapping == 'R17') {
			return data_calculate.R17;
		}
		else if (source_mapping == 'R18') {
			return data_calculate.R18;
		}
		else if (source_mapping == 'R19') {
			return data_calculate.R19;
		}
		else if (source_mapping == 'R20') {
			return data_calculate.R20;
		}
		else if (source_mapping == 'R21') {
			return data_calculate.R21;
		}
		else if (source_mapping == 'R22') {
			return data_calculate.R22;
		}
		else if (source_mapping == 'R23') {
			return data_calculate.R23;
		}
		else if (source_mapping == 'R24') {
			return data_calculate.R24;
		}
		else if (source_mapping == 'R25') {
			return data_calculate.R25;
		}
		else if (source_mapping == 'R26') {
			return data_calculate.R26;
		}
		else if (source_mapping == 'R27') {
			return data_calculate.R27;
		}
		// else if (source_mapping == 'R28'){
		// 	return data_calculate.R28;
		// }
		else {
			return 0;
		}
	}

	// reference : https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
	function escapeRegExp(string) {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
	}

	function replaceAll(str, find, replace) {
		return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
	}

	function removeDot(amount) {

		var newAmount = replaceAll(amount, '.', '');

		return newAmount;
	}

	function isWeekEnd(date) {

		/*
			return 0-6
			Sunday as 0
			Monday as 1
			...
			Saturday as 6
		*/

		var tempDate = format.parse({
			value: date,
			type: format.Type.DATE
		});

		var day = tempDate.getDay();

		if (day == 0 || day == 6) {
			return true;
		} else {
			return false;
		}
	}

	function isHoliday(date) {

		// Referensi Hari Libur API
		// https://kalenderindonesia.com/api#

		var searchHoliday = search.create({
			type: 'customrecord_sti_holiday_record',
			columns: ['custrecord_sti_holiday_date'],
			filters: ['custrecord_sti_holiday_date', 'on', date]
		});

		var myResultSet = searchHoliday.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 1
		});

		if (resultRange.length > 0) {
			return true;
		} else {
			return false;
		}
	}

	function getTemplateTypeInformation(id_template) {

		var data = new Array();

		var searchData = search.create({
			type: 'customrecord_sti_template_type',
			columns: [
				'isinactive',
				'internalid',
				'name',
				'custrecord_sti_tt_subsidiary',
				'custrecord_sti_tt_transaction_type',
				'custrecord_sti_tt_lender_type',
				'custrecord_sti_tt_supplier_transfer',
				'custrecord_sti_tt_fullpaid',
				'custrecord_sti_tt_run_journal',
				'custrecord_sti_tt_run_another_temp_type',
				'custrecord_sti_tt_another_temp_type',
				'custrecord_sti_tt_description'
			],
			filters: [
				['internalid', 'is', id_template]
			]
		});

		var myResultSet = searchData.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 1
		});

		// log.debug('resultRange', resultRange);
		// log.debug('resultRange.length', resultRange.length);

		if (resultRange.length > 0) {

			var inactive = resultRange[0].getValue('isinactive');
			var internalid = parseInt(resultRange[0].getValue('internalid'));
			var name = resultRange[0].getValue('name');
			var subsidiary = parseInt(resultRange[0].getValue('custrecord_sti_tt_subsidiary'));
			var transaction_type = parseInt(resultRange[0].getValue('custrecord_sti_tt_transaction_type'));
			var lender_type = parseInt(resultRange[0].getValue('custrecord_sti_tt_lender_type'));
			var supplier_transfer = resultRange[0].getValue('custrecord_sti_tt_supplier_transfer');
			var fullpaid = resultRange[0].getValue('custrecord_sti_tt_fullpaid');
			var run_journal = resultRange[0].getValue('custrecord_sti_tt_run_journal');
			var run_another_journal = resultRange[0].getValue('custrecord_sti_tt_run_another_temp_type');
			var another_template = parseInt(resultRange[0].getValue('custrecord_sti_tt_another_temp_type'));
			var description = resultRange[0].getValue('custrecord_sti_tt_description');

			data.push({
				'inactive': inactive,
				'internalid': internalid,
				'name': name,
				'subsidiary': subsidiary,
				'transaction_type': transaction_type,
				'lender_type': lender_type,
				'supplier_transfer': supplier_transfer,
				'fullpaid': fullpaid,
				'run_journal': run_journal,
				'run_another_journal': run_another_journal,
				'another_template': another_template,
				'description': description
			});
		}

		return data;
	}

	function checkTemplateTypeIdByName(template_name) {

		var internalid = 0;

		var searchData = search.create({
			type: 'customrecord_sti_template_type',
			columns: [
				'isinactive',
				'internalid',
				'name'
			],
			filters: [
				['isinactive', 'is', false], 'and',
				['name', 'is', template_name]
			]
		});

		var myResultSet = searchData.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 1
		});

		if (resultRange.length > 0) {

			internalid = parseInt(resultRange[0].getValue('internalid'));

		}

		return internalid;

	}


	function updateJournal1stForRelatedJournal(id_type_journal_1, id_journal_1, id_journal_2) {

		var dataRecord = record.load({
			type: id_type_journal_1,
			id: id_journal_1,
			isDynamic: true
		});

		dataRecord.setValue('custbody_sti_related_ati_transaction', id_journal_2);

		dataRecord.save();
	}

	function runProcessWithTemplateId(
		id_template,
		id_bg_process,
		data,
		id_staging,
		loan_id,
		id_transaction_type,
		transaction_type,
		collection_account,
		pph_tax_account,
		len_acc_coa,
		repayment_date,
		delivery_date
	) {

		// Do Next Process
		log.debug('Found Suitable id_template', id_template);

		// Update id_template on BG Process
		updateBGProcess(id_bg_process, '', id_template, '', '', '', '');

		// Calculate Code based on Staging Data
		var data_calculate = calculateCode(data);


		log.debug('data_calculate ' + typeof data_calculate, data_calculate);


		// Create calculate_code_record
		var id_calculate = createCalculateRecord(data_calculate, id_staging, loan_id, id_transaction_type, transaction_type, id_template);

		if (id_calculate > 0) {

			log.debug('Success create calculate_code with id', id_calculate);

			// Update id_calculate on BG Process
			updateBGProcess(id_bg_process, '', '', id_calculate, '', '', '');

			// Set template_journal 1st
			var obj_template_journal = JSON.parse(getTemplateJournal(
				id_template,
				collection_account,
				pph_tax_account,
				len_acc_coa,
				data_calculate
			));

			log.debug('obj_template_journal ' + typeof obj_template_journal, obj_template_journal);
			log.debug('obj_template_journal.length ' + typeof obj_template_journal.length, obj_template_journal.length);
			log.debug('obj_template_journal[0].error ' + typeof obj_template_journal[0].error, obj_template_journal[0].error);

			if (obj_template_journal.length > 0) {

				if (obj_template_journal[0].error === 0) {

					var template_journal = obj_template_journal[0].data;

					log.debug('template_journal.length ' + typeof template_journal.length, template_journal.length);

					if (template_journal.length > 0) {

						log.debug('Template Jurnal Found and Set', template_journal);

						// Run template_journal
						var journal_id = runTemplateJournal(
							id_staging,
							id_transaction_type,
							id_template,
							repayment_date,
							delivery_date,
							id_calculate,
							template_journal
						);

						if (journal_id > 0) {

							// success create journal
							log.debug('Journal Created', journal_id);

							// Update journal 1st on BG Process
							updateBGProcess(id_bg_process, '', '', '', journal_id, '', '');
							updateCalculationFormula(id_calculate, journal_id, '');



							var data_template = getTemplateTypeInformation(id_template)[0];

							var run_another_journal = data_template.run_another_journal;
							var another_template = data_template.another_template;

							log.debug('run_another_journal ' + typeof run_another_journal, run_another_journal);
							log.debug('another_template ' + typeof another_template, another_template);

							if (run_another_journal && (another_template != '')) {

								var data_template_2nd = getTemplateTypeInformation(another_template)[0];

								log.debug('data_template_2nd ' + typeof data_template_2nd, data_template_2nd);

								// Run 2nd Journal
								var obj_template_journal_2nd = JSON.parse(getTemplateJournal(
									another_template,
									collection_account,
									pph_tax_account,
									len_acc_coa,
									data_calculate
								));

								log.debug('obj_template_journal_2nd ' + typeof obj_template_journal_2nd, obj_template_journal_2nd);
								log.debug('obj_template_journal_2nd.length ' + typeof obj_template_journal_2nd.length, obj_template_journal_2nd.length);
								log.debug('obj_template_journal_2nd[0].error ' + typeof obj_template_journal_2nd[0].error, obj_template_journal_2nd[0].error);


								if (obj_template_journal_2nd.length > 0) {

									if (obj_template_journal_2nd[0].error === 0) {

										var template_journal_2nd = obj_template_journal_2nd[0].data;

										if (template_journal_2nd.length > 0) {

											log.debug('Template Jurnal 2nd Found and Set', template_journal_2nd);

											// Run template_journal
											var journal_id_2nd = runTemplateJournal(
												id_staging,
												data_template_2nd.transaction_type,
												another_template,
												repayment_date,
												delivery_date,
												id_calculate,
												template_journal_2nd
											);

											if (journal_id_2nd > 0) {

												// success create journal_id_2nd
												log.debug('Journal Created', journal_id_2nd);

												// update Related Journal 2nd to Journal 1st
												var id_type_journal_1 = getIdTransaction(id_transaction_type);
												updateJournal1stForRelatedJournal(id_type_journal_1, journal_id, journal_id_2nd);

												updateStagingData(id_staging, id_calculate);

												updateCalculationFormula(id_calculate, '', journal_id_2nd);

												// Update journal_id_2nd on BG Process & Finish all process
												updateBGProcess(id_bg_process, 3, '', '', '', journal_id_2nd, '');

											}
											else {

												// Error when run template_journal 2nd
												updateBGProcess(id_bg_process, 4, '', '', '', '', 'Error when Run template_journal 2nd');

											}

										}
										else {

											// Error when run template_journal 2nd
											updateBGProcess(id_bg_process, 4, '', '', '', '', 'Error when find template_journal 2nd');

										}
									}
									else {
										updateBGProcess(id_bg_process, 4, '', '', '', '', 'Error when getTemplateJournal, there is mapping account with value 0');
									}
								}
								else {
									// Error when created calculate_code_record
									updateBGProcess(id_bg_process, 4, '', '', '', '', 'Error, No template journal mapped !');
								}
							}
							else {

								// Finish Proses with 1 journal
								updateStagingData(id_staging, id_calculate);
								updateBGProcess(id_bg_process, 3, '', '', '', '', '');
							}

						}
						else {

							// Error when run template_journal
							updateBGProcess(id_bg_process, 4, '', '', '', '', 'Error when Run template_journal 1st');

						}

					}
					else {

						// Error when template_journal not found
						updateBGProcess(id_bg_process, 4, '', '', '', '', 'Error when find template_journal');

					}
				}
				else {
					// Error when There is Mapping account 0
					updateBGProcess(id_bg_process, 4, '', '', '', '', 'Error when getTemplateJournal, there is mapping account with value 0');
				}
			}
			else {
				// Error when created calculate_code_record
				updateBGProcess(id_bg_process, 4, '', '', '', '', 'Error, No template journal mapped !');
			}
		}
		else {

			// Error when created calculate_code_record
			updateBGProcess(id_bg_process, 4, '', '', '', '', 'Error when calculated_code process');

		}
	}

	function updateStagingData(id_staging, id_calculate) {

		var data = record.load({
			type: 'customrecord_sti_staging_data',
			id: id_staging,
			isDynamic: true
		});

		if (id_calculate != '') {
			data.setValue('custrecord_sti_related_calc_formula', id_calculate);
		}

		data.save();

	}

	function updateCalculationFormula(id_calculate, id_journal_1, id_journal_2) {

		var data = record.load({
			type: 'customrecord_sti_calculation_formula',
			id: id_calculate,
			isDynamic: true
		});

		if (id_journal_1 != '') {
			data.setValue('custrecord_sti_cf_related_journal', id_journal_1);
		}

		if (id_journal_2 != '') {
			data.setValue('custrecord_sti_cf_related_2nd_journal', id_journal_2);
		}

		data.save();

	}


	function getSearchBGProcess() {

		var custom_columns = [];

		custom_columns.push(search.createColumn({
			name: 'internalid',
			sort: search.Sort.DESC
		}));
		custom_columns.push(search.createColumn('created'));
		custom_columns.push(search.createColumn('lastmodified'));
		custom_columns.push(search.createColumn('lastmodifiedby'));
		custom_columns.push(search.createColumn('custrecord_sti_bpsd_id_staging_data'));
		custom_columns.push(search.createColumn('custrecord_sti_bpsd_status'));
		custom_columns.push(search.createColumn('custrecord_sti_bpsd_template_type'));
		custom_columns.push(search.createColumn('custrecord_sti_bpsd_calculation_rec'));
		custom_columns.push(search.createColumn('custrecord_sti_bpsd_1_journal'));
		custom_columns.push(search.createColumn('custrecord_sti_bpsd_2_journal'));
		custom_columns.push(search.createColumn('custrecord_sti_bpsd_error_message'));

		var searchData = search.create({
			type: 'customrecord_sti_bg_process_stag_data',
			columns: custom_columns,
			filters: []
		});

		var myResultSet = searchData.run();

		var resultRange = myResultSet.getRange({
			start: 0,
			end: 20
		});

		log.debug('resultRange ' + typeof resultRange, resultRange);

		var data = new Array();

		for (var i = 0; i < resultRange.length; i++) {

			internalid = resultRange[i].getValue('internalid');
			created = resultRange[i].getValue('created');
			lastmodified = resultRange[i].getValue('lastmodified');
			lastmodifiedby = resultRange[i].getValue('lastmodifiedby');

			id_staging_data = resultRange[i].getValue('custrecord_sti_bpsd_id_staging_data');
			bg_status = resultRange[i].getText('custrecord_sti_bpsd_status');
			template_type = resultRange[i].getText('custrecord_sti_bpsd_template_type');
			calculation_record = resultRange[i].getText('custrecord_sti_bpsd_calculation_rec');
			journal_1st = resultRange[i].getText('custrecord_sti_bpsd_1_journal');
			journal_2nd = resultRange[i].getText('custrecord_sti_bpsd_2_journal');
			error_message = resultRange[i].getValue('custrecord_sti_bpsd_error_message');

			data.push({

				'internalid': internalid,
				'created': created,
				'lastmodified': lastmodified,
				'lastmodifiedby': lastmodifiedby,
				'id_staging_data': id_staging_data,
				'bg_status': bg_status,
				'template_type': template_type,
				'calculation_record': calculation_record,
				'journal_1st': journal_1st,
				'journal_2nd': journal_2nd,
				'error_message': error_message
			});


			// log.debug('internalid '+typeof internalid, internalid);
			// log.debug('created '+typeof created, created);
			// log.debug('lastmodified '+typeof lastmodified, lastmodified);
			// log.debug('lastmodifiedby '+typeof lastmodifiedby, lastmodifiedby);
			// log.debug('id_staging_data '+typeof id_staging_data, id_staging_data);
			// log.debug('bg_status '+typeof bg_status, bg_status);
			// log.debug('template_type '+typeof template_type, template_type);
			// log.debug('calculation_record '+typeof calculation_record, calculation_record);
			// log.debug('journal_1st '+typeof journal_1st, journal_1st);
			// log.debug('journal_2nd '+typeof journal_2nd, journal_2nd);
			// log.debug('error_message '+typeof error_message, error_message);
		}

		return data;
	}

	function goToSuitelet(script_id, deployment_id) {

		document.location = url.resolveScript({
			scriptId: script_id,
			deploymentId: deployment_id
		});

	}

	function getEffectivePPNRate(date) {

		var ppn_rate = 0;

		var customrecord_sti_effective_ppn_rateSearchObj = search.create({
			type: "customrecord_sti_effective_ppn_rate",
			filters:
				[
					["formuladate: {custrecord_sti_eppn_date}", "onorbefore", date]
				],
			columns:
				[
					search.createColumn({
						name: "custrecord_sti_eppn_date",
						sort: search.Sort.DESC,
						label: "Effective Date"
					}),
					search.createColumn({ name: "custrecord_sti_eppn_rate", label: "Effective PPN Rate" }),
					search.createColumn({ name: "custrecord_sti_eppn_description", label: "Description" })
				]
		});
		var searchResultCount = customrecord_sti_effective_ppn_rateSearchObj.runPaged().count;
		// log.debug("customrecord_sti_effective_ppn_rateSearchObj result count",searchResultCount);

		customrecord_sti_effective_ppn_rateSearchObj.run().each(function (result) {
			// .run().each has a limit of 4,000 results

			ppn_rate = parseFloat(result.getValue({
				name: 'custrecord_sti_eppn_rate'
			}));

			// return true;
		});

		return ppn_rate;

	}

	function calculateCodeR26(B04_Lender_Interest_Amount, B07_STI_interest_Amount, R03_Repayment_Interest) {

		var temp = B04_Lender_Interest_Amount + B07_STI_interest_Amount;
		var R26_code_value = 0;

		if (temp !== 0) {
			R26_code_value = (B04_Lender_Interest_Amount / (B04_Lender_Interest_Amount + B07_STI_interest_Amount)) * R03_Repayment_Interest;
		}

		return R26_code_value;
	}

	function getEffectiveLenderInterestRate(lender, date) {

		var lender_interest_rate = 0;

		var customrecord_sti_effective_lend_int_rateSearchObj = search.create({
			type: "customrecord_sti_effective_lend_int_rate",
			filters:
				[
					["formuladate: {custrecord_sti_elir_effective_date}", "onorbefore", date],
					"AND",
					["custrecord_sti_elir_lender", "anyof", lender],
					"AND",
					["isinactive", "is", "F"]
				],
			columns:
				[
					search.createColumn({ name: "custrecord_sti_elir_lender", label: "Lender" }),
					search.createColumn({
						name: "custrecord_sti_elir_effective_date",
						sort: search.Sort.DESC,
						label: "Effective Date"
					}),
					search.createColumn({ name: "custrecord_sti_elir_effective_int_rate", label: "Effective Interest Rate" }),
					search.createColumn({ name: "custrecord_sti_elir_description", label: "Description" })
				]
		});
		var searchResultCount = customrecord_sti_effective_lend_int_rateSearchObj.runPaged().count;
		log.debug("customrecord_sti_effective_lend_int_rateSearchObj result count", searchResultCount);

		customrecord_sti_effective_lend_int_rateSearchObj.run().each(function (result) {
			// .run().each has a limit of 4,000 results

			lender_interest_rate = parseFloat(result.getValue({
				name: 'custrecord_sti_elir_effective_int_rate'
			}));

			// return true;
		});

		return parseFloat(lender_interest_rate / 100);

	}

	function getEffectiveLenderPenaltyRate(lender, date) {

		log.debug("getEffectiveLenderPenaltyRate");
		log.debug("lender "+typeof lender, lender);
		log.debug("date "+typeof date, date);

		var lender_penalty_rate = 0;

		var dataSearch = search.create({
			type: "customrecord_sti_effective_len_pen_rate",
			filters:
				[
					["formuladate: {custrecord_sti_elpr_effective_date}", "onorbefore", date],
					"AND",
					["custrecord_sti_elpr_lender", "anyof", lender],
					"AND",
					["isinactive", "is", "F"]
				],
			columns:
				[
					search.createColumn({ name: "custrecord_sti_elpr_lender", label: "Lender" }),
					search.createColumn({
						name: "custrecord_sti_elpr_effective_date",
						sort: search.Sort.DESC,
						label: "Effective Date"
					}),
					search.createColumn({ name: "custrecord_sti_elpr_penalty_rate", label: "Effective Penalty Rate" }),
					search.createColumn({ name: "custrecord_sti_elpr_description", label: "Description" })
				]
		});

		var searchResultCount = dataSearch.runPaged().count;
		log.debug("dataSearch result count", searchResultCount);

		dataSearch.run().each(function (result) {
			// .run().each has a limit of 4,000 results

			lender_penalty_rate = parseFloat(result.getValue({
				name: 'custrecord_sti_elpr_penalty_rate'
			}));

			// return true;
		});

		return parseFloat(lender_penalty_rate / 100);
	}

	function getEffectiveLenderGracePeriod(lender, date) {

		var lender_grace_period = 0;

		var dataSearch = search.create({
			type: "customrecord_sti_eff_lender_grace_period",
			filters:
				[
					["formuladate: {custrecord_sti_elgp_effective_date}", "onorbefore", date],
					"AND",
					["custrecord_sti_elgp_lender", "anyof", lender],
					"AND",
					["isinactive", "is", "F"]
				],
			columns:
				[
					search.createColumn({ name: "custrecord_sti_elgp_lender", label: "Lender" }),
					search.createColumn({
						name: "custrecord_sti_elgp_effective_date",
						sort: search.Sort.DESC,
						label: "Effective Date"
					}),
					search.createColumn({ name: "custrecord_sti_elgp_grace_period", label: "Effective Grace Period" }),
					search.createColumn({ name: "custrecord_sti_elgp_description", label: "Description" })
				]
		});

		var searchResultCount = dataSearch.runPaged().count;
		log.debug("dataSearch result count", searchResultCount);

		dataSearch.run().each(function (result) {
			// .run().each has a limit of 4,000 results

			lender_grace_period = parseFloat(result.getValue({
				name: 'custrecord_sti_elgp_grace_period'
			}));

			// return true;
		});

		return lender_grace_period;
	}

	function getEffectiveLenderPPHTaxRate(lender, date) {

		var lender_pph_tax_rate = 0;

		var dataSearch = search.create({
			type: "customrecord_sti_eff_lender_pph_tax_rate",
			filters:
				[
					["formuladate: {custrecord_sti_elptr_effective_date}", "onorbefore", date],
					"AND",
					["custrecord_sti_elptr_lender", "anyof", lender],
					"AND",
					["isinactive", "is", "F"]
				],
			columns:
				[
					search.createColumn({ name: "custrecord_sti_elptr_lender", label: "Lender" }),
					search.createColumn({
						name: "custrecord_sti_elptr_effective_date",
						sort: search.Sort.DESC,
						label: "Effective Date"
					}),
					search.createColumn({ name: "custrecord_sti_elptr_pph_tax_rate", label: "Effective PPH Tax Rate" }),
					search.createColumn({ name: "custrecord_sti_elptr_description", label: "Description" })
				]
		});

		var searchResultCount = dataSearch.runPaged().count;
		log.debug("dataSearch result count", searchResultCount);

		dataSearch.run().each(function (result) {
			// .run().each has a limit of 4,000 results

			lender_pph_tax_rate = parseFloat(result.getValue({
				name: 'custrecord_sti_elptr_pph_tax_rate'
			}));

			// return true;
		});

		return parseFloat(lender_pph_tax_rate / 100);
	}

	function findDiscountRepayment(
		loan_id,
		delivery_date
	) {

		var id_staging = 0;
		var discount_repayment = 0;

		var customrecord_sti_staging_dataSearchObj = search.create({
			type: "customrecord_sti_staging_data",
			filters:
				[
					["custrecord_sti_loan_id", "is", loan_id],
					"AND",
					["custrecord_sti_transaction_type", "is", "discount"],
					"AND",
					["custrecord_sti_discount_type", "is", "discount_repayment"],
					"AND",
					["custrecord_sti_delivery_date", "is", delivery_date]
				],
			columns:
				[
					search.createColumn({
						name: "internalid",
						sort: search.Sort.ASC,
						label: "Internal ID"
					}),
					search.createColumn({ name: "custrecord_sti_loan_id", label: "loan_id" }),
					search.createColumn({ name: "custrecord_sti_customer_id", label: "customer_id" }),
					search.createColumn({ name: "custrecord_sti_transaction_type", label: "transaction_type" }),
					search.createColumn({ name: "custrecord_sti_delivery_date", label: "delivery_date" }),
					search.createColumn({ name: "custrecord_sti_discount_type", label: "discount_type" }),
					search.createColumn({ name: "custrecord_sti_discount", label: "discount" })
				]
		});
		var searchResultCount = customrecord_sti_staging_dataSearchObj.runPaged().count;
		log.debug("customrecord_sti_staging_dataSearchObj result count", searchResultCount);
		customrecord_sti_staging_dataSearchObj.run().each(function (result) {
			// .run().each has a limit of 4,000 results

			log.debug('result ' + typeof result, result);

			id_staging = parseFloat(result.getValue({
				name: 'internalid'
			}));

			discount_repayment = parseFloat(result.getValue({
				name: 'custrecord_sti_discount'
			}));

			return false;
		});

		return {
			'id_staging': id_staging,
			'discount_repayment': discount_repayment
		};
	}

	function getRepaymentAmountExpected(
		repayment_id_staging,
		amount_expected,
		loan_id,
		repayment_date
	) {

		// Find Matched Discount with Discount Type discount_repayment

		var repayment_amount_expected = 0;

		var data_discount = findDiscountRepayment(
			loan_id,
			repayment_date
		);

		log.debug('data_discount.discount_repayment ' + typeof data_discount.discount_repayment, data_discount.discount_repayment);

		if (data_discount.discount_repayment > 0) {
			repayment_amount_expected = amount_expected - data_discount.discount_repayment;

			var staging_data = record.load({
				type: 'customrecord_sti_staging_data',
				id: repayment_id_staging,
				isDynamic: true
			});

			staging_data.setValue('custrecord_sti_rel_disc_rep_staging', data_discount.id_staging);

			staging_data.save();
		}
		else {
			repayment_amount_expected = amount_expected;
		}

		return repayment_amount_expected;
	}

	function getDiscountRepayment(B02_Interest_Amount, B05_Principal_Amount, B06_Loan_Amount) {

		/*
			Description
			===========
			D15 : B02_Interest_Amount
			D18 : B05_Principal_Amount
			D19 : B06_Loan_Amount
	   
			Update 22 Nov 2022
			==================
			=IF((D15+D18)>D19,D15+D18-D19,0)
	   
		*/
		var discount_disbursement = 0;

		if ((B02_Interest_Amount + B05_Principal_Amount) > B06_Loan_Amount) {
			discount_disbursement = B02_Interest_Amount + B05_Principal_Amount - B06_Loan_Amount;
		}

		return discount_disbursement;
	}

	function getToday_ASIA_BANGKOK() {

		var date = new Date();

		var ASIA_BANGKOK_TIME = format.format({
			value: date,
			type: format.Type.DATETIME,
			timezone: format.Timezone.ASIA_BANGKOK
		});

		var today = ASIA_BANGKOK_TIME.substring(0, 10);

		return today;
	}

	// Get Repayment Information
	function getRepaymentInfo(loan_id, delivery_date) {

		log.debug("getRepaymentInfo");
		log.debug("loan_id "+typeof loan_id, loan_id);
		log.debug("delivery_date "+typeof delivery_date, delivery_date);

		var collection_bank = '';
		var collection_type = '';
		var due_date_lender = '';

		var customrecord_sti_staging_dataSearchObj = search.create({
			type: "customrecord_sti_staging_data",
			filters:
				[
					["custrecord_sti_loan_id", "is", loan_id],
					"AND",
					["custrecord_sti_transaction_type", "is", "repayment"],
					"AND",
					["custrecord_sti_repayment_date", "is", delivery_date]
				],
			columns:
				[
					/**
					 * Update Function 7 July 2023
					 * ===========================
					 * There issue when have more than 1 for repayment with same repayment date with different collection bank/type
					 * according usage, this function used for latefee and waivefee transaction
					 * so we can add new condition, to add sort the latest repayment that will be reference
					 * Add Sort DESC for date_created
					 */
					search.createColumn({
						name: "created",
						sort: search.Sort.DESC,
						label: "Date Created"
					}),
					search.createColumn({ name: "custrecord_sti_transaction_type", label: "transaction_type" }),
					search.createColumn({ name: "custrecord_sti_loan_id", label: "loan_id" }),
					search.createColumn({ name: "custrecord_sti_repayment_date", label: "repayment_date" }),
					search.createColumn({ name: "custrecord_sti_collection_bank", label: "collection_bank" }),
					search.createColumn({ name: "custrecord_sti_collection_type", label: "collection_type" }),
					search.createColumn({ name: "custrecord_sti_due_date_lender", label: "Due Date Lender" })
				]
		});
		var searchResultCount = customrecord_sti_staging_dataSearchObj.runPaged().count;
		log.debug("customrecord_sti_staging_dataSearchObj result count", searchResultCount);
		customrecord_sti_staging_dataSearchObj.run().each(function (result) {
			// .run().each has a limit of 4,000 results

			collection_bank = result.getValue('custrecord_sti_collection_bank');
			collection_type = result.getValue('custrecord_sti_collection_type');
			due_date_lender = result.getValue('custrecord_sti_due_date_lender');

			// return true;
		});

		return ({
			'collection_bank': collection_bank,
			'collection_type': collection_type,
			'due_date_lender': due_date_lender
		})
	}

	function getLenderfeeExpense(R15_Waive, R06_Penalty_Amount, R08_Lender_Penalty_Amount) {
		/*
			Update 17 Feb 2022
			==================
			R20_Partial_VAT_Out changed to R20_Lenderfee_Expenses
	   
			=IF(D41=D32,D34,IF((D32-D41)<D34,D34-(D32-D41),0))
	   
			D41	=	R15_Waive
			D32	=	R06_Penalty_Amount
			D34	=	R08_Lender_Penalty_Amount
		*/

		var lenderfee_expense = 0;

		if (R15_Waive == R06_Penalty_Amount) {
			lenderfee_expense = R08_Lender_Penalty_Amount;
		}
		else {

			if ((R06_Penalty_Amount - R15_Waive) < R08_Lender_Penalty_Amount) {
				lenderfee_expense = R08_Lender_Penalty_Amount - (R06_Penalty_Amount - R15_Waive);
			}
			else {
				lenderfee_expense = 0;
			}
		}

		return lenderfee_expense;
	}

	function checkRelatedJournalStagingData(id) {

		var relatedCalculationId = '';
		var relatedCalculationText = '';
		var relatedJournalId = '';
		var relatedJournalText = '';

		var customrecord_sti_staging_dataSearchObj = search.create({
			type: "customrecord_sti_staging_data",
			filters:
				[
					["internalid", "anyof", id]
				],
			columns:
				[
					search.createColumn({ name: "custrecord_sti_loan_id", label: "loan_id" }),
					search.createColumn({ name: "custrecord_sti_transaction_type", label: "transaction_type" }),
					search.createColumn({
						name: "custrecord_sti_cf_related_journal",
						join: "CUSTRECORD_STI_RELATED_CALC_FORMULA",
						label: "Related Journal"
					}),
					search.createColumn({ name: "custrecord_sti_related_calc_formula", label: "Related Calculation Formula" })
				]
		});
		var searchResultCount = customrecord_sti_staging_dataSearchObj.runPaged().count;
		log.debug("customrecord_sti_staging_dataSearchObj result count", searchResultCount);
		customrecord_sti_staging_dataSearchObj.run().each(function (result) {
			// .run().each has a limit of 4,000 results

			log.debug('result ' + typeof result, result);
			relatedCalculationId = result.getValue({ name: 'custrecord_sti_related_calc_formula' });
			relatedCalculationText = result.getText({ name: 'custrecord_sti_related_calc_formula' });
			relatedJournalId = result.getValue({ name: 'custrecord_sti_cf_related_journal', join: 'CUSTRECORD_STI_RELATED_CALC_FORMULA' });
			relatedJournalText = result.getText({ name: 'custrecord_sti_cf_related_journal', join: 'CUSTRECORD_STI_RELATED_CALC_FORMULA' });
			// return true;
		});

		return ({
			'relatedCalculationId': relatedCalculationId,
			'relatedCalculationText': relatedCalculationText,
			'relatedJournalId': relatedJournalId,
			'relatedJournalText': relatedJournalText
		});
	}

	function mappingParamDate(param, mapping){

		log.debug("mappingParamDate "+typeof param, param);
		log.debug("mapping "+typeof mapping, mapping);

		var date = "";

		switch (parseInt(param)) {
			case 1:
				date = mapping.current_date;
				break;
			case 2:
				date = mapping.delivery_date;
				break;
			case 3:
				date = mapping.repayment_date;
				break;
			default:
				break;
		}

		log.debug("date "+typeof date, date);


		return date;
	}


	return {
		createBGProcess: createBGProcess,
		updateBGProcess: updateBGProcess,
		getTemplateTypeByCondition: getTemplateTypeByCondition,
		setTemplateType: setTemplateType,
		check2ndTemplateType: check2ndTemplateType,
		checkRunJournal: checkRunJournal,
		runTemplateJournal: runTemplateJournal,
		searchDataNeedToProcess: searchDataNeedToProcess,
		runSSNeedtoProcess: runSSNeedtoProcess,
		getNumber: getNumber,
		getTemplateType: getTemplateType,
		getStagingData: getStagingData,
		validationData: validationData,
		getLenderInformation: getLenderInformation,
		getInterestToLender: getInterestToLender,
		getRepaymentPrinciple: getRepaymentPrinciple,
		getRepaymentInterest: getRepaymentInterest,
		getBiayaKeterlambatanLender: getBiayaKeterlambatanLender,
		getSTIBankPenalty: getSTIBankPenalty,
		getOverpayment: getOverpayment,
		calculateCode: calculateCode,
		createCalculateRecord: createCalculateRecord,
		extractError: extractError,
		getTemplateJournal: getTemplateJournal,
		getTemplateTypeInformation: getTemplateTypeInformation,
		checkTemplateTypeIdByName: checkTemplateTypeIdByName,
		updateJournal1stForRelatedJournal: updateJournal1stForRelatedJournal,
		getTransactionType: getTransactionType,
		getIdTransaction: getIdTransaction,
		runProcessWithTemplateId: runProcessWithTemplateId,
		getSearchBGProcess: getSearchBGProcess,
		searchDataPendingDisbursement: searchDataPendingDisbursement,
		goToSuitelet: goToSuitelet,
		getEffectivePPNRate: getEffectivePPNRate,
		getTransactionDate: getTransactionDate,
		getEffectiveLenderInterestRate: getEffectiveLenderInterestRate,
		getEffectiveLenderPenaltyRate: getEffectiveLenderPenaltyRate,
		getEffectiveLenderGracePeriod: getEffectiveLenderGracePeriod,
		getEffectiveLenderPPHTaxRate: getEffectiveLenderPPHTaxRate,
		getToday_ASIA_BANGKOK: getToday_ASIA_BANGKOK,
		checkRelatedJournalStagingData: checkRelatedJournalStagingData,
		mappingParamDate: mappingParamDate
	}
});
