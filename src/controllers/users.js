const bcrypt = require('bcryptjs');
const sharp = require('sharp');

const User = require('../models/user');

exports.createUser = async (req, res, next) => {
	const user = new User(req.body);
	try {
		await user.save();

		const token = await user.generateAuthToken();
		res.status(201).send({ user, token });
	} catch (error) {
		res.status(400).send(error);
	}
};

exports.login = async (req, res, next) => {
	const email = req.body.email;
	const password = req.body.password;

	try {
		const user = await User.findOne({ email: email });
		if (!user) {
			throw new Error('Invalid email or password');
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			throw new Error('Invalid email or password');
		}

		const token = await user.generateAuthToken();

		// shorthand syntax instead of user:user, token:token
		res.send({ user, token });
	} catch (error) {
		res.status(400).send();
	}
};

exports.getProfile = async (req, res, next) => {
	res.send(req.user);
};

exports.updateUser = async (req, res, next) => {
	const updates = Object.keys(req.body);
	const allowedUpdates = ['name', 'email', 'password', 'age'];
	const isValidOperation = updates.every((update) =>
		allowedUpdates.includes(update)
	);

	if (!isValidOperation) {
		return res.status(400).send('Invalid updates');
	}

	try {
		const user = req.user;

		updates.forEach((update) => (user[update] = req.body[update]));
		await user.save();

		res.send(user);
	} catch (error) {
		res.status(400).send(error);
	}
};

exports.uploadImage = async (req, res, next) => {
	const buffer = await sharp(req.file.buffer)
		.resize({ width: 250, height: 250 })
		.png()
		.toBuffer();
	req.user.image = buffer;
	await req.user.save();
	res.send();
};

exports.deleteImage = async (req, res, next) => {
	req.user.image = undefined;
	await req.user.save();
	res.send();
};

exports.getImage = async (req, res, next) => {
	const id = req.params.id;
	try {
		const user = await User.findById(id);

		if (!user || !user.image) {
			throw new Error();
		}

		res.set('Content-Type', 'image/png');
		res.send(user.image);
	} catch (error) {
		res.status(404).send();
	}
};

exports.deleteUser = async (req, res, next) => {
	try {
		await req.user.remove();
		res.send('User deleted successfully');
	} catch (error) {
		res.status(400).send(error);
	}
};

exports.logout = async (req, res, next) => {
	try {
		req.user.tokens = req.user.tokens.filter((token) => {
			return token.token !== req.token;
		});
		res.send('Logged out successfully');
		await req.user.save();
	} catch (error) {
		res.status(500).send();
	}
};

exports.logoutAll = async (req, res, next) => {
	try {
		req.user.tokens = [];
		res.send('Logged out of all devices successfully');
		await req.user.save();
	} catch (error) {
		res.status(500).send();
	}
};
