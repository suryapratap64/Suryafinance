import { Request, Response } from "express";
import { transactionService } from "../services";
import path from "path";
import { supabase } from "../lib/supabase";
// export const createTransactionController = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const user_id = parseInt(req.userId);
//     const result = await transactionService.createTransaction({
//       ...req.body,
//       user_id,
//       transaction_date: new Date(req.body.transaction_date),
//     });

//     return res.status(201).json(result);
//   } catch (error: any) {
//     return res.status(error.statusCode || 503).json({
//       status: "error",
//       message: error.message || "Server error",
//     });
//   }
// };

export const createTransactionController = async (
  req: Request,
  res: Response
) => {
  try {
    const user_id = req.user?.id; // From Supabase auth middleware
    const txnData = req.body;

    console.log("Backend Transaction Data:", txnData);

    // Import the Supabase client
    const { supabase } = require("../lib/supabase");

    // 🔹 Step 1: Find or create SecurityMaster entry
    const { data: existingSecurity, error: searchError } = await supabase
      .from("securities_master")
      .select("*")
      .eq("symbol", txnData.symbol.trim().toUpperCase())
      .eq("security_type", txnData.security_type)
      .single();

    if (searchError && searchError.code !== "PGRST116") {
      throw searchError;
    }

    let security = existingSecurity;

    if (!security) {
      const { data: newSecurity, error: createError } = await supabase
        .from("securities_master")
        .insert({
          symbol: txnData.symbol.trim().toUpperCase(),
          name: txnData.name?.trim(),
          security_type: txnData.security_type,
        })
        .select()
        .single();

      if (createError) throw createError;
      security = newSecurity;
    }

    // 🔹 Step 2: Create Transaction with linked security_id
    const { data: result, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id,
        security_id: security.id,
        transaction_type: txnData.transaction_type || "BUY",
        transaction_date: txnData.transaction_date
          ? new Date(txnData.transaction_date).toISOString()
          : new Date().toISOString(),
        quantity: Number(txnData.quantity),
        price_per_unit: Number(txnData.price_per_unit || txnData.price),
        total_amount:
          Number(txnData.quantity) *
          Number(txnData.price_per_unit || txnData.price),
        source: txnData.source || "MANUAL",
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    return res.status(201).json(result);
  } catch (error: any) {
    console.error("createTransactionController error:", error);
    return res.status(error.statusCode || 503).json({
      status: "error",
      message: error.message || "Server error",
    });
  }
};
export const getTransactionsController = async (
  req: Request,
  res: Response
) => {
  try {
    const user_id = req.user?.id;
    const { supabase } = require("../lib/supabase");

    const { data: txns, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        security:securities_master (*)
      `
      )
      .eq("user_id", user_id)
      .order("transaction_date", { ascending: false });

    if (error) throw error;

    return res.json(txns);
  } catch (error: any) {
    console.error("getTransactionsController error:", error);
    return res.status(error.statusCode || 503).json({
      status: "error",
      message: error.message || "Server error",
    });
  }
};

export const getSecurityTransactionsController = async (
  req: Request,
  res: Response
) => {
  try {
    const securityId = parseInt(req.params.securityId);
    const result = await transactionService.getTransactionsBySecurityId(
      securityId
    );

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 503).json({
      status: "error",
      message: error.message || "Server error",
    });
  }
};

export const uploadPortfolioCSVController = async (
  req: Request,
  res: Response
) => {
  try {
    const user_id = req.user?.id;
    const file = req.file;
    if (!req.file || !req.file.buffer) {
      return res
        .status(401)
        .send({ status: "error", message: "No file uploaded" });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext !== ".xlsx" && ext !== ".xls" && ext !== ".csv") {
      return res
        .status(401)
        .send({ status: "error", message: "Invalid file format" });
    }

    const [status, data] = await transactionService.uploadPortfolioCSV(
      user_id,
      file?.buffer,
      ext
    );
    if (!status) {
      return res.status(401).send({ status: "error", message: data });
    }
    return res.status(200).send({ status: "ok", data });
  } catch (error) {
    return res.status(503).send({ status: "error", message: "server error" });
  }
};

export const motilalOswalSyncController = async (
  req: Request,
  res: Response
) => {
  try {
    const user_id = req.user?.id;
    const [status, data] = await transactionService.motilalOswalSync(user_id);
    return res.status(200).send({ status: "ok", data });
  } catch (error) {
    return res.status(503).send({ status: "error", message: "server error" });
  }
};
